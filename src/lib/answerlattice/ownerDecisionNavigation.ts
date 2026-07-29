import {
    normalizeAnswerlatticeCanonicalAnswerId,
    normalizeAnswerlatticeEntityId,
} from '@lib/answerlattice/governanceIdBoundary';
import { normalizeAnswerlatticeReleaseId } from '@lib/answerlattice/releaseIdBoundary';

export const ANSWERLATTICE_OWNER_CONTEXT_MAX_LENGTH = 180;

const appendAnswerlatticeOwnerContext = (
    route: string,
    key: 'answer' | 'entity' | 'release',
    value: string | null,
): string => {
    if (!value || !route.startsWith('/answerlattice/') || route.length > 400) return route;
    const hashIndex = route.indexOf('#');
    const routeWithoutHash = hashIndex >= 0 ? route.slice(0, hashIndex) : route;
    const hash = hashIndex >= 0 ? route.slice(hashIndex) : '';
    const queryIndex = routeWithoutHash.indexOf('?');
    const pathname = queryIndex >= 0 ? routeWithoutHash.slice(0, queryIndex) : routeWithoutHash;
    const query = queryIndex >= 0 ? routeWithoutHash.slice(queryIndex + 1) : '';
    const searchParams = new URLSearchParams(query);
    searchParams.set(key, value);
    const nextQuery = searchParams.toString().replace(/\+/g, '%20');
    return `${pathname}${nextQuery ? `?${nextQuery}` : ''}${hash}`;
};

export const getAnswerlatticeEntityContextRoute = (
    route: string,
    entityId: unknown,
): string => appendAnswerlatticeOwnerContext(
    route,
    'entity',
    normalizeAnswerlatticeEntityId(entityId),
);

export const getAnswerlatticeAnswerContextRoute = (
    route: string,
    answerId: unknown,
): string => appendAnswerlatticeOwnerContext(
    route,
    'answer',
    normalizeAnswerlatticeCanonicalAnswerId(answerId),
);

export const getAnswerlatticeReleaseContextRoute = (
    route: string,
    releaseId: unknown,
): string => {
    const normalizedReleaseId = normalizeAnswerlatticeOwnerReleaseContext(releaseId);
    return appendAnswerlatticeOwnerContext(
        route,
        'release',
        normalizedReleaseId,
    );
};

export const normalizeAnswerlatticeOwnerReleaseContext = (releaseId: unknown): string | null => {
    const normalizedReleaseId = normalizeAnswerlatticeReleaseId(releaseId);
    return normalizedReleaseId && normalizedReleaseId.length <= ANSWERLATTICE_OWNER_CONTEXT_MAX_LENGTH
        ? normalizedReleaseId
        : null;
};
