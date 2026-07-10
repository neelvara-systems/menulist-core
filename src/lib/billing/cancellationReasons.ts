export const CANCELLATION_REASON = {
    MISSING_FUNCTIONALITY: 'missing_functionality',
    NO_LONGER_NEEDED: 'no_longer_needed',
    OTHER: 'other',
    PURCHASED_ACCIDENTALLY: 'purchased_accidentally',
    SWITCHED_PROVIDER: 'switched_provider',
    TOO_EXPENSIVE: 'too_expensive',
} as const;

export type CancellationReasonCode = typeof CANCELLATION_REASON[keyof typeof CANCELLATION_REASON];

export const CANCELLATION_REASON_OPTIONS: Array<{ code: CancellationReasonCode; label: string }> = [
    { code: CANCELLATION_REASON.NO_LONGER_NEEDED, label: 'No longer need MenuList' },
    { code: CANCELLATION_REASON.MISSING_FUNCTIONALITY, label: 'Missing a capability I need' },
    { code: CANCELLATION_REASON.TOO_EXPENSIVE, label: 'Too expensive' },
    { code: CANCELLATION_REASON.SWITCHED_PROVIDER, label: 'Switched to another provider' },
    { code: CANCELLATION_REASON.PURCHASED_ACCIDENTALLY, label: 'Purchased accidentally' },
    { code: CANCELLATION_REASON.OTHER, label: 'Other' },
];

const CANCELLATION_REASON_VALUES = new Set<string>(Object.values(CANCELLATION_REASON));
const LEGACY_REASON_MAP: Record<string, CancellationReasonCode> = {
    'No longer need a website': CANCELLATION_REASON.NO_LONGER_NEEDED,
    'Lack of functionality': CANCELLATION_REASON.MISSING_FUNCTIONALITY,
    'Too expensive': CANCELLATION_REASON.TOO_EXPENSIVE,
    'Found another tool': CANCELLATION_REASON.SWITCHED_PROVIDER,
    'Purchased accidentally': CANCELLATION_REASON.PURCHASED_ACCIDENTALLY,
    'Other (Please specify)': CANCELLATION_REASON.OTHER,
    mobile_cancellation: CANCELLATION_REASON.OTHER,
};

export function normalizeCancellationReasonCode(value: unknown): CancellationReasonCode | null {
    const reason = String(value || '').trim();
    if (CANCELLATION_REASON_VALUES.has(reason)) return reason as CancellationReasonCode;
    return LEGACY_REASON_MAP[reason] || null;
}

export function sanitizeCancellationReasonDetail(value: unknown): string | undefined {
    const detail = String(value || '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);
    return detail || undefined;
}

export function getCancellationReasonLabel(code: CancellationReasonCode): string {
    return CANCELLATION_REASON_OPTIONS.find((option) => option.code === code)?.label || 'Other';
}
