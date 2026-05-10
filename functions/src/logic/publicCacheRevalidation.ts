import * as functions from 'firebase-functions';

export async function revalidatePublicClientCacheForStore(storeId: string | number, context: string): Promise<void> {
    const normalizedStoreId = String(storeId || '').trim();
    if (!normalizedStoreId) return;

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
    const revalidationSecret = process.env.REVALIDATION_SECRET;

    if (!appBaseUrl || !revalidationSecret) {
        functions.logger.warn('[publicCacheRevalidation] Skipping public cache revalidation; app URL or secret is not configured', {
            storeId: normalizedStoreId,
            context,
            hasAppBaseUrl: Boolean(appBaseUrl),
            hasRevalidationSecret: Boolean(revalidationSecret),
        });
        return;
    }

    try {
        const revalidateUrl = new URL('/api/revalidate/menu', appBaseUrl).toString();
        const response = await fetch(revalidateUrl, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-revalidate-secret': revalidationSecret,
            },
            body: JSON.stringify({ storeId: normalizedStoreId }),
        });

        if (!response.ok) {
            functions.logger.warn('[publicCacheRevalidation] Public cache revalidation failed', {
                storeId: normalizedStoreId,
                context,
                status: response.status,
            });
        }
    } catch (error: any) {
        functions.logger.warn('[publicCacheRevalidation] Public cache revalidation errored', {
            storeId: normalizedStoreId,
            context,
            error: error?.message || String(error),
        });
    }
}
