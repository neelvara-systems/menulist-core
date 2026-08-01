import {
    normalizeExtractedBusinessProfile,
    normalizeHexColor,
    type ExtractedBusinessProfile,
} from '@data/shared/extractedBusinessProfile';
import {
    normalizePublicMenuDraftExtractedData,
    type PublicMenuDraftExtractedData,
} from '@data/shared/publicMenuDraftData';

export type PublicCreateMenuPreviewStatus =
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'expired';

export interface PublicCreateMenuPreviewDraft {
    status: PublicCreateMenuPreviewStatus;
    extractedData: PublicMenuDraftExtractedData | null;
    detectedBusinessName: string | null;
    detectedBusinessType: string | null;
    detectedBusinessCategory: string | null;
    detectedCurrencyCode: string | null;
    detectedBrandAccentColor: string | null;
    detectedImageBackgroundColor: string | null;
    suggestedProjectName: string | null;
    extractedBusinessProfile: ExtractedBusinessProfile | null;
    imageUrl: string | null;
    sourceType: string | null;
    error: string | null;
}

const PREVIEW_STATUSES = new Set<PublicCreateMenuPreviewStatus>([
    'pending',
    'processing',
    'completed',
    'failed',
    'expired',
]);

function cleanText(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return normalized ? normalized.slice(0, maxLength) : null;
}

function isPreviewStatus(value: unknown): value is PublicCreateMenuPreviewStatus {
    return typeof value === 'string'
        && PREVIEW_STATUSES.has(value as PublicCreateMenuPreviewStatus);
}

/**
 * Re-project the authenticated polling response before it reaches React state.
 * The route performs the authoritative Firestore normalization; this second
 * boundary protects the browser from malformed, legacy, proxy-corrupted, or
 * unexpectedly shaped JSON.
 */
export function normalizePublicCreateMenuPreviewDraft(
    value: unknown,
): PublicCreateMenuPreviewDraft | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = value as Record<string, unknown>;
    if (!isPreviewStatus(source.status)) return null;

    return {
        status: source.status,
        extractedData: normalizePublicMenuDraftExtractedData(source.extractedData),
        detectedBusinessName: cleanText(source.detectedBusinessName, 180),
        detectedBusinessType: cleanText(source.detectedBusinessType, 120),
        detectedBusinessCategory: cleanText(source.detectedBusinessCategory, 80),
        detectedCurrencyCode: cleanText(source.detectedCurrencyCode, 24),
        detectedBrandAccentColor: normalizeHexColor(source.detectedBrandAccentColor),
        detectedImageBackgroundColor: normalizeHexColor(source.detectedImageBackgroundColor),
        suggestedProjectName: cleanText(source.suggestedProjectName, 180),
        extractedBusinessProfile: normalizeExtractedBusinessProfile(source.extractedBusinessProfile) || null,
        imageUrl: cleanText(source.imageUrl, 2_048),
        sourceType: cleanText(source.sourceType, 80),
        error: cleanText(source.error, 500),
    };
}
