import { resolveAnswerlatticePublicContentScope } from '@lib/answerlattice/publicContentScope';

export const ANSWERLATTICE_PLATFORM_CACHE_SCOPE_KEY = 'platform';

export const resolveAnswerlatticeWorkspaceCacheScopeKey = (sessionOrUser: any): string | null => {
    const scope = resolveAnswerlatticePublicContentScope(sessionOrUser);
    return scope ? `workspace:${scope.tId}:${scope.sId}` : null;
};
