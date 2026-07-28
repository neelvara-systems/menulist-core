const POS_SYNC_SECRET_MAX_LENGTH = 512;
const POS_SYNC_SECRET_ACTOR_MAX_LENGTH = 128;

export type ProjectedPosSyncSecretDocument = {
    createdBy?: string;
    createdOn?: unknown;
    requiresRewrite: boolean;
    secret: string;
    version: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isPositiveSafeInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function normalizeStoredSecret(value: unknown): string | null {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= POS_SYNC_SECRET_MAX_LENGTH
        ? value
        : null;
}

function normalizeStoredActor(value: unknown): string | null {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= POS_SYNC_SECRET_ACTOR_MAX_LENGTH
        && value === value.trim()
        ? value
        : null;
}

export function projectPosSyncSecretDocument(
    value: unknown,
    expectedTenantId: number,
    expectedStoreId: number,
): ProjectedPosSyncSecretDocument | null {
    if (!isRecord(value)) return null;
    if (
        (value.pId !== undefined && value.pId !== 'ML')
        || (value.tId !== undefined && value.tId !== expectedTenantId)
        || (value.sId !== undefined && value.sId !== expectedStoreId)
        || !isPositiveSafeInteger(value.version)
    ) {
        return null;
    }

    const secret = normalizeStoredSecret(value.secret);
    if (!secret) return null;

    const projected: ProjectedPosSyncSecretDocument = {
        requiresRewrite: value.pId !== 'ML'
            || value.tId !== expectedTenantId
            || value.sId !== expectedStoreId,
        secret,
        version: value.version,
    };
    const createdBy = normalizeStoredActor(value.createdBy);
    if (createdBy) projected.createdBy = createdBy;
    if (value.createdOn !== undefined) projected.createdOn = value.createdOn;
    return projected;
}

export { normalizeStoredSecret as normalizePosSyncStoredSecret };
