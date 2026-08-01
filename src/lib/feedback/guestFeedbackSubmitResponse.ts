import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';

export const GUEST_FEEDBACK_SUBMIT_RESPONSE_JSON_MAX_BYTES = 16 * 1024;
const GUEST_FEEDBACK_REVIEW_URL_MAX_LENGTH = 2048;
const MAX_GUEST_FEEDBACK_REVIEW_URL_PARSE_DIAGNOSTICS = 20;

const reportedGuestFeedbackReviewUrlParseShapes = new Set<string>();

export type GuestFeedbackSubmitResponse = {
    error?: string;
    feedbackId?: string;
    reviewUrl?: string | null;
    success: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isNonEmptyString = (value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
);

function logGuestFeedbackReviewUrlParseFailure(source: string, value: unknown, error: unknown): void {
    if (source === 'unknown') return;

    const raw = typeof value === 'string' ? value.trim() : '';
    const valueType = Array.isArray(value) ? 'array' : typeof value;
    const shapeKey = [
        source,
        valueType,
        raw.length > 0,
        raw.length,
        raw.length > GUEST_FEEDBACK_REVIEW_URL_MAX_LENGTH,
    ].join(':');

    if (reportedGuestFeedbackReviewUrlParseShapes.has(shapeKey)) return;
    if (reportedGuestFeedbackReviewUrlParseShapes.size >= MAX_GUEST_FEEDBACK_REVIEW_URL_PARSE_DIAGNOSTICS) return;
    reportedGuestFeedbackReviewUrlParseShapes.add(shapeKey);

    logRuntimeFailure('guest_feedback_review_url_parse_failed', error, {
        source,
        valueType,
        reviewUrlPresent: raw.length > 0,
        reviewUrlLength: raw.length,
        reviewUrlExceedsMaxLength: raw.length > GUEST_FEEDBACK_REVIEW_URL_MAX_LENGTH,
        fallbackPolicy: 'omit_review_url',
    });
}

export function normalizeGuestFeedbackReviewUrl(value: unknown, source = 'unknown'): string | null {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw || raw.length > GUEST_FEEDBACK_REVIEW_URL_MAX_LENGTH) return null;

    try {
        const parsed = new URL(raw);
        if (parsed.protocol !== 'https:') return null;

        const host = parsed.hostname.toLowerCase();
        const isGoogleHost = host === 'google.com' || host.endsWith('.google.com');
        const isReviewPath = parsed.pathname.includes('/local/writereview')
            || parsed.pathname.includes('/maps');
        const isGPageReview = host === 'g.page' && parsed.pathname.includes('/review');
        const isGoogleMapsShortlink = host === 'maps.app.goo.gl'
            || (host === 'goo.gl' && parsed.pathname.startsWith('/maps'));

        if ((isGoogleHost && isReviewPath) || isGPageReview || isGoogleMapsShortlink) {
            return raw;
        }
    } catch (error) {
        logGuestFeedbackReviewUrlParseFailure(source, value, error);
        return null;
    }

    return null;
}

const isOptionalSafeReviewUrl = (value: unknown): value is string | null | undefined => (
    value === undefined
    || value === null
    || normalizeGuestFeedbackReviewUrl(value) !== null
);

export const isGuestFeedbackSubmitResponse = (
    value: unknown,
): value is GuestFeedbackSubmitResponse => {
    if (!isRecord(value) || typeof value.success !== 'boolean') {
        return false;
    }

    if (value.success === true) {
        return isNonEmptyString(value.feedbackId)
            && isOptionalSafeReviewUrl(value.reviewUrl);
    }

    return value.error === undefined || typeof value.error === 'string';
};

export type SuccessfulGuestFeedbackSubmitResponse = GuestFeedbackSubmitResponse & {
    feedbackId: string;
    success: true;
};

export const isSuccessfulGuestFeedbackSubmitResponse = (
    value: GuestFeedbackSubmitResponse | null | undefined,
): value is SuccessfulGuestFeedbackSubmitResponse => (
    value !== null
    && value !== undefined
    && value.success === true
    && isNonEmptyString(value.feedbackId)
    && isOptionalSafeReviewUrl(value.reviewUrl)
);
