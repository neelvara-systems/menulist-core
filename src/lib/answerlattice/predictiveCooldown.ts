import { createHash } from 'node:crypto';

export interface AnswerlatticePredictiveCooldownStore {
    set: (
        key: string,
        value: string,
        options: { ex: number; nx: true },
    ) => Promise<unknown>;
}

const normalizePositiveScopeId = (value: unknown): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
);

const normalizeCooldownIdentity = (value: unknown): string | null => (
    typeof value === 'string' && value.length > 0 && value.length <= 1_500 ? value : null
);

const hashCooldownIdentity = (value: string): string => (
    createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 32)
);

export const buildAnswerlatticePredictiveCooldownKey = (params: {
    tId: number;
    sId: number;
    userId: string;
    triggerId: string;
}): string | null => {
    const tId = normalizePositiveScopeId(params.tId);
    const sId = normalizePositiveScopeId(params.sId);
    const userId = normalizeCooldownIdentity(params.userId);
    const triggerId = normalizeCooldownIdentity(params.triggerId);
    if (tId === null || sId === null || !userId || !triggerId) return null;

    return [
        'answerlattice',
        'predictive',
        'cooldown',
        tId,
        sId,
        hashCooldownIdentity(userId),
        hashCooldownIdentity(triggerId),
    ].join(':');
};

export const claimAnswerlatticePredictiveCooldown = async (params: {
    store: AnswerlatticePredictiveCooldownStore;
    key: string;
    cooldownHours: number;
}): Promise<boolean> => {
    if (!params.key || params.key.length > 256) return false;
    if (
        !Number.isSafeInteger(params.cooldownHours)
        || params.cooldownHours < 1
        || params.cooldownHours > 720
    ) return false;

    const result = await params.store.set(params.key, '1', {
        ex: params.cooldownHours * 3600,
        nx: true,
    });
    return result === 'OK';
};
