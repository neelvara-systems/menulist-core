import { getBoundedLogValueContext } from '@lib/monitoring/boundedLogContext';
import type { AnswerlatticePublicCacheSegment } from '@lib/actions/revalidateAnswerlatticePublicCache';
import { secureError } from '@lib/security/secureLogger';

const ANSWERLATTICE_PUBLIC_CACHE_REVALIDATION_TIMEOUT_MS = 4000;
const ANSWERLATTICE_PUBLIC_CACHE_CONTEXT_MAX_LENGTH = 64;

const pendingRevalidations = new Map<string, Promise<void>>();

const ANSWERLATTICE_PUBLIC_CACHE_FAILURE_CODES = {
    bad_status: 'answerlattice_public_cache_revalidation_bad_status',
    request_failed: 'answerlattice_public_cache_revalidation_request_failed',
} as const;

type AnswerlatticePublicCacheScope = {
    tId?: string | number | null;
    sId?: string | number | null;
};

const normalizeSegmentList = (segments?: AnswerlatticePublicCacheSegment | AnswerlatticePublicCacheSegment[]) => {
    const list = Array.isArray(segments) ? segments : [segments || 'all'];
    return Array.from(new Set(list.filter(Boolean)));
};

const sanitizeAnswerlatticePublicCacheContext = (context: string): string => {
    const value = String(context || 'answerlatticePublicClientCache').trim();
    if (!value) {
        return 'answerlatticePublicClientCache';
    }

    const bounded = value.slice(0, ANSWERLATTICE_PUBLIC_CACHE_CONTEXT_MAX_LENGTH);
    return /^[a-zA-Z0-9:_-]+$/.test(bounded) ? bounded : 'answerlatticePublicClientCache';
};

const getBoundedAnswerlatticePublicCacheStringContext = (
    label: string,
    value: unknown,
) => {
    return getBoundedLogValueContext(label, value);
};

const logAnswerlatticePublicClientCacheFailure = (
    context: string,
    scope: AnswerlatticePublicCacheScope | null | undefined,
    segmentCount: number,
    failureType: 'bad_status' | 'request_failed',
    metadata: Record<string, unknown> = {},
): void => {
    if (process.env.NODE_ENV === 'production') {
        return;
    }

    secureError(
        '[answerlattice-public-cache] Failed to revalidate public client cache',
        new Error(ANSWERLATTICE_PUBLIC_CACHE_FAILURE_CODES[failureType]),
        {
            context: sanitizeAnswerlatticePublicCacheContext(context),
            segmentCount,
            ...getBoundedAnswerlatticePublicCacheStringContext('tenantId', scope?.tId),
            ...getBoundedAnswerlatticePublicCacheStringContext('storeId', scope?.sId),
            ...metadata,
        },
    );
};

export const revalidateAnswerlatticePublicClientCache = async (
    scope?: AnswerlatticePublicCacheScope | null,
    segments: AnswerlatticePublicCacheSegment | AnswerlatticePublicCacheSegment[] = 'all',
    context = 'answerlatticePublicClientCache',
    options: { throwOnFailure?: boolean } = {},
): Promise<void> => {
    if (typeof window === 'undefined') {
        return;
    }

    const normalizedSegments = normalizeSegmentList(segments);
    const key = [
        String(scope?.tId ?? 'session'),
        String(scope?.sId ?? 'session'),
        normalizedSegments.join(','),
        options.throwOnFailure ? 'strict' : 'best-effort',
    ].join(':');

    const pending = pendingRevalidations.get(key);
    if (pending) {
        return pending;
    }

    const revalidation = (async () => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => {
            controller.abort();
        }, ANSWERLATTICE_PUBLIC_CACHE_REVALIDATION_TIMEOUT_MS);

        try {
            const response = await fetch('/api/revalidate/answerlattice', {
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

            if (!response.ok) {
                if (process.env.NODE_ENV !== 'production') {
                    logAnswerlatticePublicClientCacheFailure(context, scope, normalizedSegments.length, 'bad_status', {
                        responseStatus: response.status,
                    });
                }
                if (options.throwOnFailure) {
                    throw new Error(ANSWERLATTICE_PUBLIC_CACHE_FAILURE_CODES.bad_status);
                }
            }
        } catch (error) {
            if (
                options.throwOnFailure
                && error instanceof Error
                && error.message === ANSWERLATTICE_PUBLIC_CACHE_FAILURE_CODES.bad_status
            ) {
                throw error;
            }
            if (process.env.NODE_ENV !== 'production') {
                logAnswerlatticePublicClientCacheFailure(context, scope, normalizedSegments.length, 'request_failed', {
                    errorName: error instanceof Error ? error.name : typeof error,
                });
            }
            if (options.throwOnFailure) {
                throw new Error(ANSWERLATTICE_PUBLIC_CACHE_FAILURE_CODES.request_failed);
            }
        } finally {
            window.clearTimeout(timeout);
            pendingRevalidations.delete(key);
        }
    })();

    pendingRevalidations.set(key, revalidation);
    return revalidation;
};
