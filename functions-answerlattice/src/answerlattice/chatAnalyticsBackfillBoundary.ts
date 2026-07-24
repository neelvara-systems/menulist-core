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
    const productIds = [store.pId, store.productId].filter((entry) => entry !== undefined);
    const tenantIds = [store.tId, store.tenantId].filter((entry) => entry !== undefined);
    const storeIds = [store.sId, store.storeId].filter((entry) => entry !== undefined);
    return productIds.length > 0
        && productIds.every((entry) => entry === 'AL')
        && tenantIds.length > 0
        && tenantIds.every((entry) => entry === expectedTId)
        && storeIds.length > 0
        && storeIds.every((entry) => entry === expectedSId)
        && store.active !== false
        && store.deleted !== true
        && store.authDisabled !== true
        && store.blocked !== true;
}
