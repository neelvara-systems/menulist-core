import { createUppercaseRandomIdSegment } from '@lib/runtime/randomId';

export const generateOwnCustomUid = (
    tenantId: string | number,
    storeId: string | number,
): string => {
    const randomStr = createUppercaseRandomIdSegment(6);
    return `${tenantId}-${randomStr}-${storeId}`;
};
