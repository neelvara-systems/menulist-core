import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin } from '../firebaseAdmin';
import { validateNetworkTargetUrl } from '../utils/networkTarget';
import { getBoundedFunctionsErrorContext } from '../utils/boundedErrorContext';

const PUBLIC_CACHE_REVALIDATION_CONFIG_MISSING_CODE = 'PUBLIC_CACHE_REVALIDATION_CONFIG_MISSING';
const PUBLIC_CACHE_REVALIDATION_TARGET_REJECTED_CODE = 'PUBLIC_CACHE_REVALIDATION_TARGET_REJECTED';
const PUBLIC_CACHE_REVALIDATION_REQUEST_FAILED_CODE = 'PUBLIC_CACHE_REVALIDATION_REQUEST_FAILED';
const PUBLIC_CACHE_REVALIDATION_REQUEST_ERRORED_CODE = 'PUBLIC_CACHE_REVALIDATION_REQUEST_ERRORED';
const PUBLIC_CACHE_SCREEN_TOUCH_FAILED_CODE = 'PUBLIC_CACHE_SCREEN_TOUCH_FAILED';

type PublicCacheRevalidationOptions = {
    touchDigitalScreen?: boolean;
};

export type PublicCacheRevalidationResult = {
    cacheRevalidated: boolean;
    screenTouchAttempted: boolean;
    screenTouchSucceeded: boolean;
};

function boundedDiagnosticValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed.slice(0, 80) : null;
    }
    return null;
}

function getPublicCacheErrorContext(error: unknown): Record<string, string | number | null> {
    const context = getBoundedFunctionsErrorContext(error);
    return {
        sourceErrorName: context.sourceErrorName || typeof error,
        sourceErrorCode: context.sourceErrorCode ?? null,
        sourceErrorStatus: context.sourceStatusCode ?? null,
    };
}

function getPublicCacheRequestContext(normalizedStoreId: string, context: string): Record<string, string | number | boolean> {
    return {
        contextLength: context.length,
        hasContext: context.length > 0,
        storeIdLength: normalizedStoreId.length,
    };
}

function getPublicCacheTargetContext(result: { addressCount?: number; error?: string; errorName?: string }): Record<string, string | number | null | undefined> {
    return {
        addressCount: result.addressCount || 0,
        targetError: boundedDiagnosticValue(result.error),
        targetErrorName: boundedDiagnosticValue(result.errorName),
    };
}

async function touchDigitalScreenContentVersionForStore(normalizedStoreId: string, context: string): Promise<boolean> {
    try {
        const screenRef = firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`campaigns_${normalizedStoreId}`);
        const publicScreenRef = firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`screen_${normalizedStoreId}`);

        await firestoreAdmin.runTransaction(async (transaction) => {
            const screenSnap = await transaction.get(screenRef);
            const screen = screenSnap.exists ? screenSnap.data()?.screen : null;

            if (!screen?.screenToken) {
                return;
            }

            const now = Timestamp.now();
            const nextContentVersion = Number(screen.contentVersion || 0) + 1;

            transaction.update(screenRef, {
                'screen.contentVersion': nextContentVersion,
                'screen.lastContentChangeAt': now,
            });
            transaction.set(publicScreenRef, {
                contentVersion: nextContentVersion,
                enabled: screen.enabled === true,
                lastContentChangeAt: now,
                storeId: String(normalizedStoreId),
                updatedAt: now,
            }, { merge: false });
        });
        return true;
    } catch (error: unknown) {
        functions.logger.warn('[publicCacheRevalidation] Digital screen version touch failed', {
            failureCode: PUBLIC_CACHE_SCREEN_TOUCH_FAILED_CODE,
            ...getPublicCacheRequestContext(normalizedStoreId, context),
            ...getPublicCacheErrorContext(error),
        });
        return false;
    }
}

export async function revalidatePublicClientCacheForStore(
    storeId: string | number,
    context: string,
    options: PublicCacheRevalidationOptions = {},
): Promise<PublicCacheRevalidationResult> {
    const normalizedStoreId = String(storeId || '').trim();
    if (!normalizedStoreId) {
        return {
            cacheRevalidated: false,
            screenTouchAttempted: false,
            screenTouchSucceeded: false,
        };
    }

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
    const revalidationSecret = process.env.REVALIDATION_SECRET;
    let cacheRevalidated = false;

    if (!appBaseUrl || !revalidationSecret) {
        functions.logger.warn('[publicCacheRevalidation] Skipping public cache revalidation; app URL or secret is not configured', {
            failureCode: PUBLIC_CACHE_REVALIDATION_CONFIG_MISSING_CODE,
            ...getPublicCacheRequestContext(normalizedStoreId, context),
            hasAppBaseUrl: Boolean(appBaseUrl),
            hasRevalidationSecret: Boolean(revalidationSecret),
        });
    } else {
        try {
            const revalidateUrl = new URL('/api/revalidate/menu', appBaseUrl).toString();
            const targetValidation = await validateNetworkTargetUrl(revalidateUrl, {
                allowLocalhostInEmulator: true,
                allowedProtocols: process.env.FUNCTIONS_EMULATOR === 'true' ? ['http:', 'https:'] : ['https:'],
            });

            if (!targetValidation.valid || !targetValidation.normalizedUrl) {
                functions.logger.warn('[publicCacheRevalidation] Public cache revalidation target rejected', {
                    failureCode: PUBLIC_CACHE_REVALIDATION_TARGET_REJECTED_CODE,
                    ...getPublicCacheRequestContext(normalizedStoreId, context),
                    ...getPublicCacheTargetContext(targetValidation),
                });
            } else {
                const response = await fetch(targetValidation.normalizedUrl, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'x-revalidate-secret': revalidationSecret,
                    },
                    body: JSON.stringify({ storeId: normalizedStoreId }),
                });

                if (!response.ok) {
                    functions.logger.warn('[publicCacheRevalidation] Public cache revalidation failed', {
                        failureCode: PUBLIC_CACHE_REVALIDATION_REQUEST_FAILED_CODE,
                        ...getPublicCacheRequestContext(normalizedStoreId, context),
                        status: response.status,
                    });
                } else {
                    cacheRevalidated = true;
                }
            }
        } catch (error: unknown) {
            functions.logger.warn('[publicCacheRevalidation] Public cache revalidation errored', {
                failureCode: PUBLIC_CACHE_REVALIDATION_REQUEST_ERRORED_CODE,
                ...getPublicCacheRequestContext(normalizedStoreId, context),
                ...getPublicCacheErrorContext(error),
            });
        }
    }

    let screenTouchSucceeded = false;
    if (options.touchDigitalScreen === true) {
        screenTouchSucceeded = await touchDigitalScreenContentVersionForStore(normalizedStoreId, context);
    }

    return {
        cacheRevalidated,
        screenTouchAttempted: options.touchDigitalScreen === true,
        screenTouchSucceeded,
    };
}
