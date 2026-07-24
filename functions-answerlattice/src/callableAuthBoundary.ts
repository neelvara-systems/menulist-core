export type AnswerlatticePlatformCallableIdentity = {
    accessRevision: number;
    email: string;
    platformRole: string;
    userId: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

export const normalizeAnswerlatticeCallableEmail = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const email = value.toLowerCase().trim();
    return email && email.includes('@') ? email : null;
};

export const normalizeAnswerlatticeCallableUserId = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const userId = value.trim();
    return userId === value
        && userId.length > 0
        && userId.length <= 180
        && userId !== '.'
        && userId !== '..'
        && !userId.includes('/')
        && !/^__.*__$/.test(userId)
        ? userId
        : null;
};

export const normalizeAnswerlatticeCallableAccessRevision = (value: unknown): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
        ? value
        : null
);

export const isCurrentAnswerlatticePlatformCallableUser = (
    userData: unknown,
    identity: AnswerlatticePlatformCallableIdentity,
): boolean => {
    if (!isRecord(userData)) return false;
    const storedUserIds = [userData.id, userData.uId]
        .filter((value) => value !== undefined)
        .map(normalizeAnswerlatticeCallableUserId);
    const productIds = [userData.pId, userData.productId].filter((value) => value !== undefined);

    return storedUserIds.length > 0
        && storedUserIds.every((value) => value === identity.userId)
        && normalizeAnswerlatticeCallableEmail(userData.email) === identity.email
        && productIds.length > 0
        && productIds.every((value) => value === 'AL')
        && userData.active === true
        && userData.isVerified === true
        && userData.deleted !== true
        && userData.authDisabled !== true
        && userData.blocked !== true
        && userData.tenantBlocked !== true
        && userData.platformRole === identity.platformRole
        && normalizeAnswerlatticeCallableAccessRevision(userData.accessRevision ?? 0) === identity.accessRevision;
};
