import {
    DEFAULT_FEEDBACK_SETTINGS,
    type FeedbackDefaults,
} from '@type/guestFeedback';

const isUnknownRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const readBoolean = (
    record: Record<string, unknown>,
    key: keyof FeedbackDefaults,
): boolean => (
    typeof record[key] === 'boolean'
        ? record[key]
        : Boolean(DEFAULT_FEEDBACK_SETTINGS[key])
);

export function normalizePublicFeedbackDefaults(value: unknown): FeedbackDefaults {
    const record = isUnknownRecord(value) ? value : {};
    return {
        collectComment: readBoolean(record, 'collectComment'),
        collectCommentRequired: readBoolean(record, 'collectCommentRequired'),
        collectName: readBoolean(record, 'collectName'),
        collectNameRequired: readBoolean(record, 'collectNameRequired'),
        collectPhone: readBoolean(record, 'collectPhone'),
        collectPhoneRequired: readBoolean(record, 'collectPhoneRequired'),
        collectEmail: readBoolean(record, 'collectEmail'),
        collectEmailRequired: readBoolean(record, 'collectEmailRequired'),
    };
}
