import { useClientAuthSession } from '@hook/useClientAuthSession';
import {
    ANSWERLATTICE_PLATFORM_CACHE_SCOPE_KEY,
    resolveAnswerlatticeWorkspaceCacheScopeKey,
} from '@lib/answerlattice/clientCacheScope';

export type AnswerlatticeCacheAudience = 'workspace' | 'platform';

export const useAnswerlatticeCacheScope = (
    audience: AnswerlatticeCacheAudience = 'workspace',
): string | null => {
    const session = useClientAuthSession();
    if (!session) return null;
    if (audience === 'platform') return ANSWERLATTICE_PLATFORM_CACHE_SCOPE_KEY;

    return resolveAnswerlatticeWorkspaceCacheScopeKey(session);
};
