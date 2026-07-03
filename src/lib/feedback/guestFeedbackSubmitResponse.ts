export const GUEST_FEEDBACK_SUBMIT_RESPONSE_JSON_MAX_BYTES = 16 * 1024;

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

export function normalizeGuestFeedbackReviewUrl(value: unknown): string | null {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw || raw.length > 2048) return null;

    try {
        const parsed = new URL(raw);
        if (parsed.protocol !== 'https:') return null;

        const host = parsed.hostname.toLowerCase();
        const isGoogleHost = host === 'google.com' || host.endsWith('.google.com');
        const isReviewPath = parsed.pathname.includes('/local/writereview')
            || parsed.pathname.includes('/maps');
        const isGPageReview = host === 'g.page' && parsed.pathname.includes('/review');
        const isGoogleMapsShortlink = host === 'maps.app.goo.gl' || host === 'goo.gl';

        if ((isGoogleHost && isReviewPath) || isGPageReview || isGoogleMapsShortlink) {
            return raw;
        }
    } catch {
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
    Boolean(value)
    && value.success === true
    && isNonEmptyString(value.feedbackId)
    && isOptionalSafeReviewUrl(value.reviewUrl)
);
