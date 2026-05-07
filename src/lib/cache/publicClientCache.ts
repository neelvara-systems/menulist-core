const PUBLIC_CACHE_REVALIDATION_TIMEOUT_MS = 4000;

const pendingRevalidations = new Map<string, Promise<void>>();

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
): Promise<void> => {
    const normalizedStoreId = String(storeId ?? '').trim();
    if (!normalizedStoreId || typeof window === 'undefined') {
        return;
    }

    const pending = pendingRevalidations.get(normalizedStoreId);
    if (pending) {
        return pending;
    }

    const revalidation = (async () => {
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
                signal: controller.signal,
                body: JSON.stringify({ storeId: normalizedStoreId }),
            });

            if (!response.ok && process.env.NODE_ENV !== 'production') {
                console.warn(
                    `[public-cache] ${context} failed to revalidate public client cache`,
                    response.status,
                );
            }
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn(
                    `[public-cache] ${context} failed to revalidate public client cache`,
                    error,
                );
            }
        } finally {
            window.clearTimeout(timeout);
            pendingRevalidations.delete(normalizedStoreId);
        }
    })();

    pendingRevalidations.set(normalizedStoreId, revalidation);
    return revalidation;
};

export const revalidatePublicClientCacheForProject = async (
    projectId?: string | number | null,
    context = 'publicClientCacheForProject',
): Promise<void> => {
    const storeId = getStoreIdFromProjectId(projectId);
    await revalidatePublicClientCache(storeId, context);
};
