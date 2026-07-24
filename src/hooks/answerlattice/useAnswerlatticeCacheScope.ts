import { useClientAuthSession } from '@hook/useClientAuthSession';
import {
    ANSWERLATTICE_PLATFORM_CACHE_SCOPE_KEY,
    resolveAnswerlatticeWorkspaceCacheScopeKey,
} from '@lib/answerlattice/clientCacheScope';
import { resolveAnswerlatticePublicContentScope } from '@lib/answerlattice/publicContentScope';
import { useMemo } from 'react';

export type AnswerlatticeCacheAudience = 'workspace' | 'platform';

export const useAnswerlatticeCacheScope = (
    audience: AnswerlatticeCacheAudience = 'workspace',
): string | null => {
    const session = useClientAuthSession();
    if (!session) return null;
    if (audience === 'platform') return ANSWERLATTICE_PLATFORM_CACHE_SCOPE_KEY;

    return resolveAnswerlatticeWorkspaceCacheScopeKey(session);
};

export const useAnswerlatticePublicContentRequestScope = () => {
    const session = useClientAuthSession();
    const scope = resolveAnswerlatticePublicContentScope(session);
    return useMemo(
        () => scope ? { tId: scope.tId, sId: scope.sId } : null,
        [scope?.sId, scope?.tId],
    );
};
