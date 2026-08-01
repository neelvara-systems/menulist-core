import { invalidateOwnerBusinessAssistantBrowserCache } from "@lib/ownerBusinessAssistant/cacheInvalidation";
import { secureError } from "@lib/security/secureLogger";
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';

const PUBLIC_CACHE_REVALIDATION_TIMEOUT_MS = 4000;
const PUBLIC_CACHE_CONTEXT_MAX_LENGTH = 64;

type PendingPublicCacheRevalidation = {
    context: string;
    options: PublicCacheRevalidationOptions;
    promise: Promise<void>;
    rerunRequested: boolean;
};

export type PublicCacheRevalidationOptions = {
    projectId?: string | number | null;
    touchScreen?: boolean;
};

type PublicCacheRevalidationRequest = {
    context: string;
    options: PublicCacheRevalidationOptions;
};

const pendingRevalidations = new Map<string, PendingPublicCacheRevalidation>();

export const mergePendingPublicCacheRevalidation = (
    current: PublicCacheRevalidationRequest,
    incoming: PublicCacheRevalidationRequest,
): PublicCacheRevalidationRequest => {
    if (current.options.touchScreen === true && incoming.options.touchScreen !== true) {
        return current;
    }

    return incoming;
};

const sanitizePublicCacheContext = (context: string): string => {
    const value = String(context || 'publicClientCache').trim();
    if (!value) {
        return 'publicClientCache';
    }

    const bounded = value.slice(0, PUBLIC_CACHE_CONTEXT_MAX_LENGTH);
    return /^[a-zA-Z0-9:_-]+$/.test(bounded) ? bounded : 'publicClientCache';
};

const logPublicClientCacheFailure = (
    context: string,
    storeId: string,
    failureType: 'bad_status' | 'request_failed',
    metadata: Record<string, unknown> = {},
): void => {
    secureError(
        '[public-cache] Failed to revalidate public client cache',
        new Error(`public_cache_revalidation_${failureType}`),
        {
            context: sanitizePublicCacheContext(context),
            storeIdPresent: Boolean(storeId),
            storeIdLength: storeId.length,
            ...metadata,
        },
    );
};

const executePublicClientCacheRevalidation = async (
    normalizedStoreId: string,
    context: string,
    options: PublicCacheRevalidationOptions,
): Promise<void> => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
        controller.abort();
    }, PUBLIC_CACHE_REVALIDATION_TIMEOUT_MS);

    try {
        const response = await fetch('/api/revalidate/menu', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            cache: 'no-store',
            redirect: 'manual',
            signal: controller.signal,
            body: JSON.stringify({
                storeId: normalizedStoreId,
                ...(options.projectId !== undefined ? { projectId: options.projectId } : {}),
                touchScreen: options.touchScreen === true,
            }),
        });

        if (!response.ok) {
            logPublicClientCacheFailure(context, normalizedStoreId, 'bad_status', {
                responseStatus: response.status,
            });
        }
    } catch (error) {
        logPublicClientCacheFailure(context, normalizedStoreId, 'request_failed', {
            errorName: getBoundedErrorName(error) || typeof error,
        });
    } finally {
        window.clearTimeout(timeout);
    }
};

export const getStoreIdFromProjectId = (
    projectId?: string | number | null,
): string | null => {
    const value = String(projectId ?? '').trim();
    if (!value) {
        return null;
    }

    const parts = value.split('-').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
};

export const revalidatePublicClientCache = async (
    storeId?: string | number | null,
    context = 'publicClientCache',
    options: PublicCacheRevalidationOptions = {},
): Promise<void> => {
    const normalizedStoreId = String(storeId ?? '').trim();
    if (!normalizedStoreId || typeof window === 'undefined') {
        return;
    }

    invalidateOwnerBusinessAssistantBrowserCache({ storeId: normalizedStoreId });

    const pending = pendingRevalidations.get(normalizedStoreId);
    if (pending) {
        const merged = mergePendingPublicCacheRevalidation(
            { context: pending.context, options: pending.options },
            { context, options },
        );
        pending.rerunRequested = true;
        pending.context = merged.context;
        pending.options = merged.options;
        return pending.promise;
    }

    const entry: PendingPublicCacheRevalidation = {
        context,
        options,
        promise: Promise.resolve(),
        rerunRequested: false,
    };

    entry.promise = (async () => {
        try {
            do {
                const iterationContext = entry.context;
                const iterationOptions = entry.options;
                entry.rerunRequested = false;
                await executePublicClientCacheRevalidation(
                    normalizedStoreId,
                    iterationContext,
                    iterationOptions,
                );
            } while (entry.rerunRequested);
        } finally {
            if (pendingRevalidations.get(normalizedStoreId) === entry) {
                pendingRevalidations.delete(normalizedStoreId);
            }
        }
    })();

    pendingRevalidations.set(normalizedStoreId, entry);
    return entry.promise;
};

export const revalidatePublicClientCacheForProject = async (
    projectId?: string | number | null,
    context = 'publicClientCacheForProject',
): Promise<void> => {
    const storeId = getStoreIdFromProjectId(projectId);
    invalidateOwnerBusinessAssistantBrowserCache({ storeId, projectId });
    await revalidatePublicClientCache(storeId, context, {
        projectId,
        touchScreen: true,
    });
};
