export const generateOwnCustomUid = (
    tenantId: string | number,
    storeId: string | number,
): string => {
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${tenantId}-${randomStr}-${storeId}`;
};
