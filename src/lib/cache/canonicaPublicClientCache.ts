import type { CanonicaPublicCacheSegment } from '@lib/actions/revalidateCanonicaPublicCache';

const CANONICA_PUBLIC_CACHE_REVALIDATION_TIMEOUT_MS = 4000;

const pendingRevalidations = new Map<string, Promise<void>>();

type CanonicaPublicCacheScope = {
    tId?: string | number | null;
    sId?: string | number | null;
};

const normalizeSegmentList = (segments?: CanonicaPublicCacheSegment | CanonicaPublicCacheSegment[]) => {
    const list = Array.isArray(segments) ? segments : [segments || 'all'];
    return Array.from(new Set(list.filter(Boolean)));
};

export const revalidateCanonicaPublicClientCache = async (
    scope?: CanonicaPublicCacheScope | null,
    segments: CanonicaPublicCacheSegment | CanonicaPublicCacheSegment[] = 'all',
    context = 'canonicaPublicClientCache',
): Promise<void> => {
    if (typeof window === 'undefined') {
        return;
    }

    const normalizedSegments = normalizeSegmentList(segments);
    const key = [
        String(scope?.tId ?? 'session'),
        String(scope?.sId ?? 'session'),
        normalizedSegments.join(','),
    ].join(':');

    const pending = pendingRevalidations.get(key);
    if (pending) {
        return pending;
    }

    const revalidation = (async () => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => {
            controller.abort();
        }, CANONICA_PUBLIC_CACHE_REVALIDATION_TIMEOUT_MS);

        try {
            const response = await fetch('/api/revalidate/canonica', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                cache: 'no-store',
                signal: controller.signal,
                body: JSON.stringify({
                    tId: scope?.tId ?? undefined,
                    sId: scope?.sId ?? undefined,
                    segments: normalizedSegments,
                }),
            });

            if (!response.ok && process.env.NODE_ENV !== 'production') {
                console.warn(
                    `[canonica-public-cache] ${context} failed to revalidate public cache`,
                    response.status,
                );
            }
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn(
                    `[canonica-public-cache] ${context} failed to revalidate public cache`,
                    error,
                );
            }
        } finally {
            window.clearTimeout(timeout);
            pendingRevalidations.delete(key);
        }
    })();

    pendingRevalidations.set(key, revalidation);
    return revalidation;
};
