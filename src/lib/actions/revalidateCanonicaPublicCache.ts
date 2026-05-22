import { revalidateTag } from "next/cache";

export type CanonicaPublicCacheSegment = 'all' | 'kb' | 'faqs' | 'changelog' | 'context';

const normalizeScopeId = (value: string | number) => String(value).trim();

export const getCanonicaPublicCacheTags = (
    tId: string | number,
    sId: string | number,
    segment: CanonicaPublicCacheSegment = 'all',
): string[] => {
    const tenantId = normalizeScopeId(tId);
    const storeId = normalizeScopeId(sId);
    if (!tenantId || !storeId) return [];

    const baseTag = `canonica-public-${tenantId}-${storeId}`;
    const tags = new Set<string>([baseTag]);

    const addSegment = (nextSegment: Exclude<CanonicaPublicCacheSegment, 'all'>) => {
        tags.add(`canonica-public-${nextSegment}-${tenantId}-${storeId}`);
    };

    if (segment === 'all') {
        addSegment('kb');
        addSegment('faqs');
        addSegment('changelog');
        addSegment('context');
    } else {
        addSegment(segment);
    }

    return Array.from(tags);
};

export async function revalidateCanonicaPublicCache(
    tId: string | number,
    sId: string | number,
    segment: CanonicaPublicCacheSegment = 'all',
) {
    const tags = getCanonicaPublicCacheTags(tId, sId, segment);
    tags.forEach(tag => revalidateTag(tag));
    return tags;
}
