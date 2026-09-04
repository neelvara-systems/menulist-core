import {
    normalizeTempStatusCustomMessage,
    TEMP_STATUS_MESSAGE_MAX_LENGTH,
} from './statusBoundary';

export type TempStatusDraftIssue =
    | 'custom_message_required'
    | 'custom_message_too_long'
    | 'expiry_required'
    | 'expiry_invalid'
    | 'expiry_not_future';

interface TempStatusDraftInput {
    customMessage: unknown;
    expiresAt: unknown;
    nowMs?: number;
    statusType: unknown;
}

export function getTempStatusDraftIssue({
    customMessage,
    expiresAt,
    nowMs = Date.now(),
    statusType,
}: TempStatusDraftInput): TempStatusDraftIssue | null {
    if (statusType === 'custom') {
        if (typeof customMessage !== 'string' || !normalizeTempStatusCustomMessage(customMessage)) {
            return 'custom_message_required';
        }
        if (customMessage.length > TEMP_STATUS_MESSAGE_MAX_LENGTH) {
            return 'custom_message_too_long';
        }
    }

    if (typeof expiresAt !== 'string' || !expiresAt) return 'expiry_required';

    const expiryMs = Date.parse(expiresAt);
    if (!Number.isFinite(expiryMs) || !Number.isFinite(nowMs)) return 'expiry_invalid';
    if (expiryMs <= nowMs) return 'expiry_not_future';

    return null;
}

export function getTempStatusDraftIssueMessage(issue: TempStatusDraftIssue): string {
    switch (issue) {
        case 'custom_message_required':
            return 'Enter a custom message.';
        case 'custom_message_too_long':
            return `Custom messages can be up to ${TEMP_STATUS_MESSAGE_MAX_LENGTH} characters.`;
        case 'expiry_required':
            return 'Choose an end date and time.';
        case 'expiry_invalid':
        case 'expiry_not_future':
            return 'Choose a future end date and time.';
    }
}
