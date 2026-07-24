import { revalidateTag } from "next/cache";

export type AnswerlatticePublicCacheSegment = 'all' | 'kb' | 'faqs' | 'changelog' | 'context' | 'predictive';

const normalizeScopeId = (value: string | number) => String(value).trim();

export const getAnswerlatticePublicCacheTags = (
    tId: string | number,
    sId: string | number,
    segment: AnswerlatticePublicCacheSegment = 'all',
): string[] => {
    const tenantId = normalizeScopeId(tId);
    const storeId = normalizeScopeId(sId);
    if (!tenantId || !storeId) return [];

    const baseTag = `answerlattice-public-${tenantId}-${storeId}`;
    const tags = new Set<string>([baseTag]);

    const addSegment = (nextSegment: Exclude<AnswerlatticePublicCacheSegment, 'all'>) => {
        tags.add(`answerlattice-public-${nextSegment}-${tenantId}-${storeId}`);
    };

    if (segment === 'all') {
        addSegment('kb');
        addSegment('faqs');
        addSegment('changelog');
        addSegment('context');
        addSegment('predictive');
    } else {
        addSegment(segment);
    }

    return Array.from(tags);
};

export async function revalidateAnswerlatticePublicCache(
    tId: string | number,
    sId: string | number,
    segment: AnswerlatticePublicCacheSegment = 'all',
) {
    const tags = getAnswerlatticePublicCacheTags(tId, sId, segment);
    tags.forEach(tag => revalidateTag(tag));
    return tags;
}
