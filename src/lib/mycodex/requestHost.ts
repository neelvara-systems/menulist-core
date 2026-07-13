import { normalizeRequestAuthority } from '@lib/routing/hostAuthority';

const MYCODEX_LOCAL_DEVELOPMENT_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
]);

export function isMyCodexLocalDevelopmentHost(authority: string | null | undefined): boolean {
    const hostname = normalizeRequestAuthority(authority)?.hostname;
    return Boolean(hostname && MYCODEX_LOCAL_DEVELOPMENT_HOSTS.has(hostname));
}
