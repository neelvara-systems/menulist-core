export type AnswerlatticeChatAnalyticsBackfillInput = Readonly<{
    tId: number;
    sId: number;
    days: number;
}>;

const isPositiveScopeId = (value: unknown): value is number => (
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0
);

export function parseAnswerlatticeChatAnalyticsBackfillInput(
    value: unknown,
): AnswerlatticeChatAnalyticsBackfillInput {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('answerlattice_chat_backfill_input_invalid');
    }
    const input = value as Record<string, unknown>;
    if (Object.keys(input).some((key) => !['tId', 'sId', 'days'].includes(key))) {
        throw new Error('answerlattice_chat_backfill_input_invalid');
    }
    if (
        !isPositiveScopeId(input.tId)
        || !isPositiveScopeId(input.sId)
        || typeof input.days !== 'number'
        || !Number.isSafeInteger(input.days)
        || input.days < 1
        || input.days > 90
    ) {
        throw new Error('answerlattice_chat_backfill_input_invalid');
    }
    return { tId: input.tId, sId: input.sId, days: input.days };
}

export function isAnswerlatticeChatAnalyticsStoreScope(
    value: unknown,
    expectedTId: number,
    expectedSId: number,
): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const store = value as Record<string, unknown>;
    return store.pId === 'AL'
        && store.tId === expectedTId
        && (store.sId === expectedSId || store.storeId === expectedSId)
        && store.active !== false
        && store.deleted !== true;
}
