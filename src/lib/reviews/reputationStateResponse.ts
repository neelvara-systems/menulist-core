export const REPUTATION_STATE_RESPONSE_JSON_MAX_BYTES = 16 * 1024;

export type ReputationStateResponse = {
    data: {
        hasBlockActive: boolean;
        hasEscalationActive: boolean;
    };
    success: true;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

export const isReputationStateResponse = (value: unknown): value is ReputationStateResponse => (
    isRecord(value)
    && value.success === true
    && isRecord(value.data)
    && typeof value.data.hasBlockActive === 'boolean'
    && typeof value.data.hasEscalationActive === 'boolean'
);
