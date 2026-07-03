export const POS_SYNC_TEST_RESPONSE_JSON_MAX_BYTES = 16 * 1024;
export const POS_SYNC_TEST_REQUEST_POLICY = {
    cache: 'no-store' as RequestCache,
    credentials: 'same-origin' as RequestCredentials,
    redirect: 'manual' as RequestRedirect,
};

export type PosSyncTestResponse = {
    error?: string;
    responseTime: number;
    statusCode: number | null;
    success: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

export const isPosSyncTestResponse = (value: unknown): value is PosSyncTestResponse => {
    if (!isRecord(value) || typeof value.success !== 'boolean' || !isFiniteNumber(value.responseTime)) {
        return false;
    }

    if (value.success === true) {
        return isFiniteNumber(value.statusCode);
    }

    return value.statusCode === null || isFiniteNumber(value.statusCode);
};

export type SuccessfulPosSyncTestResponse = PosSyncTestResponse & {
    statusCode: number;
    success: true;
};

export const isSuccessfulPosSyncTestResponse = (
    value: PosSyncTestResponse | null | undefined,
): value is SuccessfulPosSyncTestResponse => (
    Boolean(value)
    && value.success === true
    && isFiniteNumber(value.statusCode)
    && isFiniteNumber(value.responseTime)
);
