/**
 * Operational Infrastructure Functions
 * ═══════════════════════════════════════════════════════════════
 * 
 * Admin tools, health monitoring, budget alerts, and incident response.
 * These are callable/HTTP functions available in all environments.
 */

import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import { timingSafeEqual } from 'crypto';
import * as functions from 'firebase-functions';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_MAX_INSTANCES, FUNCTION_OPTIONS, SECRET_GROUPS } from '../config/secrets';
import { ECOMSAI_PLATFORM_USER_ROLE } from '../constants/user';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { createAlert } from '../monitoring/alerts';
import {
    forceRepublishActiveProjects,
    isPublishVerificationScopeAuthorized,
    PUBLISH_VERIFICATION_PROJECT_LIMIT_EXCEEDED,
    PUBLISH_VERIFICATION_PROJECT_NOT_FOUND,
    PUBLISH_VERIFICATION_PUBLIC_URL_UNAVAILABLE,
    updateStoreHealth,
    verifyPublish,
} from '../monitoring/publishVerification';
import { activateSafeMode } from '../monitoring/safeMode';
import {
    normalizeOwnerNotificationDocumentId,
    normalizeOwnerNotificationNumericScopeDocumentId,
} from '../sharedData/ownerNotificationDeliveryBoundary';
import { PLATFORM_NOTIFICATION_TRIGGER_TYPES } from '../sharedData/platformNotificationRegistry';
import { resolveStoreBusinessCategory } from '../sharedData/businessTypes';
import { normalizePlatformStoreSummaryIdentity } from '../sharedData/storeSummaryBoundary';
import { resolveBusinessDayEndTime } from '../utils/businessDay';
import { computeSchedulerHour } from '../utils/schedulerHour';

function getRequesterRole(request: { auth?: { token?: Record<string, any> } }): string {
    return String(request.auth?.token?.platformRole || request.auth?.token?.role || '');
}

function assertPlatformOwner(request: { auth?: { token?: Record<string, any> } }, action: string) {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', `Must be authenticated to ${action}.`);
    }

    if (getRequesterRole(request) !== ECOMSAI_PLATFORM_USER_ROLE) {
        throw new HttpsError('permission-denied', `Only platform owners can ${action}.`);
    }
}

function isSecretMatch(provided: unknown, expected: string): boolean {
    if (typeof provided !== 'string' || !provided || !expected) return false;

    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(providedBuffer, expectedBuffer);
}

function hasTenantStoreAccess(
    request: { auth?: { token?: Record<string, any> } },
    tenantId: string | number,
    storeId: string | number,
): boolean {
    if (!request.auth) return false;
    if (getRequesterRole(request) === ECOMSAI_PLATFORM_USER_ROLE) return true;

    const token = request.auth.token || {};
    const tokenTenantId = String(token.tenantId || token.tId || '');
    const tokenStoreId = String(token.storeId || token.sId || '');
    const tokenStoreIds = Array.isArray(token.storeIds) ? token.storeIds.map(String) : [];

    return tokenTenantId === String(tenantId)
        && (tokenStoreId === String(storeId) || tokenStoreIds.includes(String(storeId)));
}

const OPERATIONS_VERIFY_MENU_PUBLISH_ACCESS_DENIED = 'OPERATIONS_VERIFY_MENU_PUBLISH_ACCESS_DENIED';
const OPERATIONS_VERIFY_MENU_PUBLISH_FAILED = 'OPERATIONS_VERIFY_MENU_PUBLISH_FAILED';
const OPERATIONS_BUDGET_ALERT_WEBHOOK_FAILED = 'OPERATIONS_BUDGET_ALERT_WEBHOOK_FAILED';
const OPERATIONS_FORCE_REPUBLISH_NO_ACTIVE_PROJECT = 'OPERATIONS_FORCE_REPUBLISH_NO_ACTIVE_PROJECT';
const OPERATIONS_FORCE_REPUBLISH_PROJECT_LIMIT_EXCEEDED = 'OPERATIONS_FORCE_REPUBLISH_PROJECT_LIMIT_EXCEEDED';
const OPERATIONS_FORCE_REPUBLISH_PUBLIC_URL_UNAVAILABLE = 'OPERATIONS_FORCE_REPUBLISH_PUBLIC_URL_UNAVAILABLE';
const OPERATIONS_FORCE_REPUBLISH_FAILED = 'OPERATIONS_FORCE_REPUBLISH_FAILED';
const OPERATIONS_BACKFILL_STORES_SUMMARY_FAILED = 'OPERATIONS_BACKFILL_STORES_SUMMARY_FAILED';
const OPERATIONS_VERIFY_MENU_PUBLISH_SUCCESS_MESSAGE_FAILED = 'OPERATIONS_VERIFY_MENU_PUBLISH_SUCCESS_MESSAGE_FAILED';
const OPERATIONS_VERIFY_MENU_PUBLISH_FAILURE_MESSAGE_FAILED = 'OPERATIONS_VERIFY_MENU_PUBLISH_FAILURE_MESSAGE_FAILED';
const VERIFY_MENU_PUBLISH_FAILED_MESSAGE = 'Menu publish verification could not be completed.';
const FORCE_REPUBLISH_PUBLIC_URL_UNAVAILABLE_MESSAGE = 'Public menu URL is not configured for force republish verification.';
const FORCE_REPUBLISH_FAILED_MESSAGE = 'Force republish could not be completed.';
const BACKFILL_STORES_SUMMARY_FAILED_MESSAGE = 'Stores summary backfill could not be completed.';
const STORES_SUMMARY_BACKFILL_MAX_STORES = 1_500;
const STORES_SUMMARY_BACKFILL_MAX_PAYLOAD_BYTES = 850_000;
const VERIFY_MENU_PUBLISH_MAX_URL_LENGTH = 2_048;

function getBoundedOperationsStringContext(label: string, value: unknown): Record<string, boolean | number> {
    const normalized = value === undefined || value === null ? '' : String(value);
    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
}

function getOperationsErrorContext(error: unknown): { sourceErrorName?: string; sourceErrorCode?: string; sourceStatusCode?: number } {
    if (!error || typeof error !== 'object') {
        return { sourceErrorName: error === undefined ? undefined : typeof error };
    }

    const record = error as Record<string, unknown>;
    const statusValue = record.status ?? record.statusCode;
    const status = Number(statusValue);

    return {
        sourceErrorName: error instanceof Error ? error.name : 'object',
        sourceErrorCode: record.code === undefined || record.code === null ? undefined : String(record.code).slice(0, 64),
        sourceStatusCode: Number.isFinite(status) ? status : undefined,
    };
}

function getOperationsCallLogContext(context: {
    publicMenuUrl?: unknown;
    requesterUid?: unknown;
    storeId?: unknown;
    tenantId?: unknown;
}): Record<string, boolean | number> {
    return {
        ...getBoundedOperationsStringContext('storeId', context.storeId),
        ...getBoundedOperationsStringContext('tenantId', context.tenantId),
        ...getBoundedOperationsStringContext('requesterUid', context.requesterUid),
        ...getBoundedOperationsStringContext('publicMenuUrl', context.publicMenuUrl),
    };
}

// ═══════════════════════════════════════════════════════════════
// MENU HEALTH MONITOR
// @see __docs__/menu-health-monitor/menu-health-monitor_impl.md
// ═══════════════════════════════════════════════════════════════

/**
 * Callable function to verify a published menu is accessible.
 * Called from the frontend after publish completes.
 */
export const verifyMenuPublish = onCall(
    {
        ...FUNCTION_OPTIONS.callableLight,
        secrets: SECRET_GROUPS.PLATFORM_ALERT_DELIVERY,
    },
    async (request) => {
        const logger = functions.logger;

        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be authenticated to verify menu publish.');
        }

        const authToken = request.auth.token || {};
        if (authToken.active === false || authToken.isVerified === false || authToken.deleted === true) {
            throw new HttpsError('permission-denied', 'Account is not allowed to verify menu publish.');
        }
        const userId = normalizeOwnerNotificationDocumentId(authToken.uId);
        if (!userId) {
            throw new HttpsError('permission-denied', 'Account is not allowed to verify menu publish.');
        }

        const input = request.data && typeof request.data === 'object' && !Array.isArray(request.data)
            ? request.data as Record<string, unknown>
            : {};
        const storeScope = normalizeOwnerNotificationNumericScopeDocumentId(input.storeId);
        const tenantScope = normalizeOwnerNotificationNumericScopeDocumentId(input.tenantId);
        const publicMenuUrl = typeof input.publicMenuUrl === 'string' ? input.publicMenuUrl : '';
        if (
            !storeScope
            || !tenantScope
            || !publicMenuUrl
            || publicMenuUrl !== publicMenuUrl.trim()
            || publicMenuUrl.length > VERIFY_MENU_PUBLISH_MAX_URL_LENGTH
        ) {
            throw new HttpsError('invalid-argument', 'Invalid store, tenant, or public menu URL.');
        }
        try {
            const parsedUrl = new URL(publicMenuUrl);
            const allowedProtocol = parsedUrl.protocol === 'https:'
                || (process.env.FUNCTIONS_EMULATOR === 'true' && parsedUrl.protocol === 'http:');
            if (!allowedProtocol || parsedUrl.username || parsedUrl.password) {
                throw new Error('invalid_public_menu_url');
            }
        } catch {
            throw new HttpsError('invalid-argument', 'Invalid store, tenant, or public menu URL.');
        }
        const storeId = storeScope.documentId;
        const tenantId = tenantScope.documentId;

        if (!hasTenantStoreAccess(request, tenantId, storeId)) {
            logger.error('[verifyMenuPublish] Tenant access denied', {
                failureCode: OPERATIONS_VERIFY_MENU_PUBLISH_ACCESS_DENIED,
                ...getOperationsCallLogContext({
                    requesterUid: request.auth.uid,
                    storeId,
                    tenantId,
                }),
            });
            throw new HttpsError('permission-denied', 'You do not have access to this store.');
        }

        if (!await isPublishVerificationScopeAuthorized(storeId, tenantId, userId, { publicMenuUrl })) {
            logger.error('[verifyMenuPublish] Canonical store scope denied', {
                failureCode: OPERATIONS_VERIFY_MENU_PUBLISH_ACCESS_DENIED,
                ...getOperationsCallLogContext({
                    requesterUid: request.auth.uid,
                    storeId,
                    tenantId,
                }),
            });
            throw new HttpsError('permission-denied', 'You do not have access to this store.');
        }

        logger.info('[verifyMenuPublish] Verifying', getOperationsCallLogContext({
            publicMenuUrl,
            requesterUid: request.auth.uid,
            storeId,
            tenantId,
        }));

        try {
            const result = await verifyPublish(publicMenuUrl);
            await updateStoreHealth(storeId, tenantId, userId, result, { publicMenuUrl });

            // Lifecycle delivery stays best-effort for the caller, but the
            // Function must await it so the runtime cannot terminate before
            // the durable claim/provider attempt finishes.
            if (result.status === 'OK') {
                try {
                    const { sendLifecycleMessage } = await import('../messaging/messagingEngine');
                    await sendLifecycleMessage({
                        storeId, tenantId,
                        eventType: 'STORE_PUBLISHED',
                        referenceId: `store-published-${storeId}`,
                        metadata: { publicUrl: publicMenuUrl, dashboardUrl: 'https://menulist.ai' },
                    });
                } catch (messageError) {
                    logger.error('[verifyMenuPublish] Lifecycle success message failed', {
                        failureCode: OPERATIONS_VERIFY_MENU_PUBLISH_SUCCESS_MESSAGE_FAILED,
                        eventType: 'STORE_PUBLISHED',
                        ...getOperationsCallLogContext({
                            publicMenuUrl,
                            requesterUid: request.auth?.uid,
                            storeId,
                            tenantId,
                        }),
                        ...getOperationsErrorContext(messageError),
                    });
                }
            } else {
                try {
                    const { sendLifecycleMessage } = await import('../messaging/messagingEngine');
                    await sendLifecycleMessage({
                        storeId, tenantId,
                        eventType: 'MENU_PUBLISH_FAILED',
                        referenceId: `menu-publish-failed-${storeId}-${Date.now()}`,
                        metadata: {
                            publicUrl: publicMenuUrl,
                            failureReason: result.failureReason || result.status || 'The public menu check failed.',
                        },
                    });
                } catch (messageError) {
                    logger.error('[verifyMenuPublish] Lifecycle failure message failed', {
                        failureCode: OPERATIONS_VERIFY_MENU_PUBLISH_FAILURE_MESSAGE_FAILED,
                        eventType: 'MENU_PUBLISH_FAILED',
                        ...getBoundedOperationsStringContext('resultStatus', result.status),
                        ...getOperationsCallLogContext({
                            publicMenuUrl,
                            requesterUid: request.auth?.uid,
                            storeId,
                            tenantId,
                        }),
                        ...getOperationsErrorContext(messageError),
                    });
                }
            }

            return {
                status: result.status,
                checks: result.checks,
                responseTimeMs: result.responseTimeMs,
                failureReason: result.failureReason,
            };
        } catch (error: any) {
            logger.error('[verifyMenuPublish] Failed', {
                failureCode: OPERATIONS_VERIFY_MENU_PUBLISH_FAILED,
                ...getOperationsCallLogContext({
                    publicMenuUrl,
                    requesterUid: request.auth.uid,
                    storeId,
                    tenantId,
                }),
                ...getOperationsErrorContext(error),
            });
            throw new HttpsError('internal', VERIFY_MENU_PUBLISH_FAILED_MESSAGE);
        }
    },
);

// ═══════════════════════════════════════════════════════════════
// GCP BUDGET ALERT WEBHOOK
// @see __docs__/cost-self-protection/cost-self-protection_impl.md
// ═══════════════════════════════════════════════════════════════

/**
 * HTTP endpoint for GCP Budget Alert notifications.
 * Google Cloud Budget → Pub/Sub → this function.
 * Auto-activates SAFE_MODE when budget threshold exceeded.
 */
export const gcpBudgetAlertWebhook = onRequest(
    {
        region: 'us-central1',
        timeoutSeconds: 10,
        memory: '256MiB' as const,
        maxInstances: 2,
        secrets: Array.from(new Set([
            ...SECRET_GROUPS.BUDGET_ALERT,
            ...SECRET_GROUPS.PLATFORM_ALERT_DELIVERY,
        ])),
    },
    async (req, res) => {
        const logger = functions.logger;

        if (req.method !== 'POST') {
            res.status(405).send('Method not allowed');
            return;
        }

        try {
            const expectedSecret = process.env.GCP_BUDGET_WEBHOOK_SECRET;
            const providedSecret = req.header('x-menulist-budget-secret') || req.query.secret;

            if (!expectedSecret) {
                logger.error('[BudgetAlert] GCP_BUDGET_WEBHOOK_SECRET is not configured');
                res.status(503).json({ received: false, error: 'Budget webhook is not configured' });
                return;
            }

            if (!isSecretMatch(providedSecret, expectedSecret)) {
                logger.warn('[BudgetAlert] Rejected request with missing or invalid webhook secret');
                res.status(401).json({ received: false, error: 'Unauthorized' });
                return;
            }

            const pubsubMessage = req.body?.message?.data;
            if (!pubsubMessage || typeof pubsubMessage !== 'string') {
                logger.warn('[BudgetAlert] Rejected request without Pub/Sub message data');
                res.status(400).json({ received: false, error: 'Missing Pub/Sub message data' });
                return;
            }

            const decoded = Buffer.from(pubsubMessage, 'base64').toString('utf-8');
            const budgetData = JSON.parse(decoded);

            const costAmount = Number(budgetData.costAmount);
            const budgetAmount = Number(budgetData.budgetAmount);
            const threshold = Number(budgetData.alertThresholdExceeded);

            if (
                !Number.isFinite(costAmount)
                || !Number.isFinite(budgetAmount)
                || !Number.isFinite(threshold)
                || budgetAmount <= 0
                || threshold <= 0
            ) {
                logger.warn('[BudgetAlert] Rejected invalid budget alert payload', {
                    hasCostAmount: budgetData.costAmount !== undefined,
                    hasBudgetAmount: budgetData.budgetAmount !== undefined,
                    hasThreshold: budgetData.alertThresholdExceeded !== undefined,
                });
                res.status(400).json({ received: false, error: 'Invalid budget alert payload' });
                return;
            }

            logger.warn('[BudgetAlert] Received', { costAmount, budgetAmount, threshold });

            await activateSafeMode(
                `GCP budget alert: ₹${costAmount} spent (threshold: ${threshold * 100}% of ₹${budgetAmount})`,
                'budget_alert',
            );

            await createAlert({
                tId: 'system',
                sId: 'system',
                type: 'usage',
                severity: 'critical',
                title: 'GCP Budget Alert — SAFE_MODE Auto-Activated',
                message: `Cost: ₹${costAmount} | Budget: ₹${budgetAmount} | Threshold: ${threshold * 100}%\n\nSAFE_MODE has been automatically activated. AI generation, bulk operations, and expensive queries are blocked.\n\nTo deactivate: /ops dashboard → Deactivate SAFE_MODE`,
                metadata: { costAmount, budgetAmount, threshold },
                triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.GCP_BUDGET_ALERT,
                productId: 'PLATFORM',
                category: 'cost',
                actionRequired: true,
            });

            res.status(200).json({ received: true, safeModeActivated: true });
        } catch (error: any) {
            logger.error('[BudgetAlert] Error processing webhook', {
                failureCode: OPERATIONS_BUDGET_ALERT_WEBHOOK_FAILED,
                ...getOperationsErrorContext(error),
            });
            res.status(400).json({ received: false, error: 'Invalid budget alert request' });
        }
    },
);

// ═══════════════════════════════════════════════════════════════
// FORCE REPUBLISH — Admin Incident Response Tool
// @see __docs__/incident-response/README.md
// ═══════════════════════════════════════════════════════════════

/**
 * Callable function to force republish a store's active project.
 * Superadmin only. Used during incident recovery.
 */
export const forceRepublish = onCall(
    {
        region: 'us-central1',
        timeoutSeconds: 60,
        memory: '256MiB' as const,
        maxInstances: FUNCTION_MAX_INSTANCES.callableLight,
        secrets: SECRET_GROUPS.PLATFORM_ALERT_DELIVERY,
    },
    async (request) => {
        const logger = functions.logger;
        assertPlatformOwner(request, 'force republish stores');

        const input = request.data && typeof request.data === 'object' && !Array.isArray(request.data)
            ? request.data as Record<string, unknown>
            : {};
        const storeScope = normalizeOwnerNotificationNumericScopeDocumentId(input.storeId);
        const tenantScope = normalizeOwnerNotificationNumericScopeDocumentId(input.tenantId);
        const userId = normalizeOwnerNotificationDocumentId(request.auth?.token?.uId);
        if (!storeScope || !tenantScope) {
            throw new HttpsError('invalid-argument', 'Invalid store or tenant.');
        }
        if (!userId) throw new HttpsError('permission-denied', 'You do not have access to this store.');
        const storeId = storeScope.documentId;
        const tenantId = tenantScope.documentId;

        logger.warn('[forceRepublish] Admin force republish', getOperationsCallLogContext({
            requesterUid: request.auth?.uid,
            storeId,
            tenantId,
        }));

        try {
            let republishClaim: Awaited<ReturnType<typeof forceRepublishActiveProjects>>;
            try {
                republishClaim = await forceRepublishActiveProjects(storeId, tenantId, userId);
            } catch (claimError) {
                if (claimError instanceof Error && claimError.message === PUBLISH_VERIFICATION_PROJECT_NOT_FOUND) {
                    throw new HttpsError('not-found', 'No active project found for this store');
                }
                if (claimError instanceof Error && claimError.message === PUBLISH_VERIFICATION_PROJECT_LIMIT_EXCEEDED) {
                    logger.error('[forceRepublish] Project limit exceeded', {
                        failureCode: OPERATIONS_FORCE_REPUBLISH_PROJECT_LIMIT_EXCEEDED,
                        ...getOperationsCallLogContext({
                            requesterUid: request.auth?.uid,
                            storeId,
                            tenantId,
                        }),
                    });
                    throw new HttpsError('resource-exhausted', 'The store has too many projects for this recovery action.');
                }
                if (claimError instanceof Error && claimError.message === PUBLISH_VERIFICATION_PUBLIC_URL_UNAVAILABLE) {
                    logger.error('[forceRepublish] Public menu URL unavailable', {
                        failureCode: OPERATIONS_FORCE_REPUBLISH_PUBLIC_URL_UNAVAILABLE,
                        ...getOperationsCallLogContext({
                            requesterUid: request.auth?.uid,
                            storeId,
                            tenantId,
                        }),
                    });
                    throw new HttpsError('failed-precondition', FORCE_REPUBLISH_PUBLIC_URL_UNAVAILABLE_MESSAGE);
                }
                throw claimError;
            }
            const { projectIds, publicMenuUrl } = republishClaim;

            // Verify after republish
            const result = await verifyPublish(publicMenuUrl);
            await updateStoreHealth(storeId, tenantId, userId, result, {
                publicMenuUrl,
                requirePlatformAuthority: true,
            });

            return {
                success: result.status === 'OK',
                projectCount: projectIds.length,
                projectId: projectIds[0],
                verification: result.status,
                publicMenuUrl,
            };
        } catch (error: any) {
            if (error instanceof HttpsError && error.code === 'not-found') {
                logger.warn('[forceRepublish] No active project found', {
                    failureCode: OPERATIONS_FORCE_REPUBLISH_NO_ACTIVE_PROJECT,
                    ...getOperationsCallLogContext({
                        requesterUid: request.auth?.uid,
                        storeId,
                        tenantId,
                    }),
                });
                throw error;
            }

            if (error instanceof HttpsError && error.code === 'failed-precondition') {
                throw error;
            }
            if (error instanceof HttpsError && error.code === 'resource-exhausted') {
                throw error;
            }

            logger.error('[forceRepublish] Failed', {
                failureCode: OPERATIONS_FORCE_REPUBLISH_FAILED,
                ...getOperationsCallLogContext({
                    requesterUid: request.auth?.uid,
                    storeId,
                    tenantId,
                }),
                ...getOperationsErrorContext(error),
            });
            throw new HttpsError('internal', FORCE_REPUBLISH_FAILED_MESSAGE);
        }
    },
);

// ═══════════════════════════════════════════════════════════════
// STORES SUMMARY BACKFILL — One-time utility
// ═══════════════════════════════════════════════════════════════

export const backfillStoresSummary = onCall({
    region: 'us-central1',
    timeoutSeconds: 300,
    memory: '512MiB',
    maxInstances: FUNCTION_MAX_INSTANCES.scheduler,
}, async (request) => {
    const logger = functions.logger;

    assertPlatformOwner(request, 'run stores summary backfill');

    logger.info('[backfillStoresSummary] Started', getOperationsCallLogContext({
        requesterUid: request.auth?.uid,
    }));

    try {
        const storesSnapshot = await db.collection(DB_COLLECTIONS.STORES)
            .orderBy(FieldPath.documentId())
            .limit(STORES_SUMMARY_BACKFILL_MAX_STORES + 1)
            .get();
        if (storesSnapshot.size > STORES_SUMMARY_BACKFILL_MAX_STORES) {
            throw new HttpsError('resource-exhausted', 'Store inventory exceeds the bounded summary backfill limit.');
        }

        const summary = Object.create(null) as Record<string, Record<string, unknown>>;
        let invalidIdentityCount = 0;

        for (const doc of storesSnapshot.docs) {
            const data = doc.data();
            const identity = normalizePlatformStoreSummaryIdentity(doc.id, data);
            if (!identity) {
                invalidIdentityCount++;
                continue;
            }
            const businessType = typeof data.businessType === 'string' && data.businessType.trim()
                ? data.businessType
                : 'unknown';
            const configuredBusinessCategory = typeof data.businessCategory === 'string'
                ? data.businessCategory
                : undefined;
            const businessCategory = resolveStoreBusinessCategory(businessType, configuredBusinessCategory);
            const timeZone = typeof data.timeZone === 'string' && data.timeZone.trim()
                ? data.timeZone
                : null;
            const configuredDayEnd = typeof data.businessDayEndTime === 'string'
                ? data.businessDayEndTime
                : undefined;
            const businessDayEndTime = resolveBusinessDayEndTime(businessType, configuredDayEnd, businessCategory);
            const schedulerHour = typeof data.schedulerHour === 'number'
                && Number.isInteger(data.schedulerHour)
                && data.schedulerHour >= 0
                && data.schedulerHour <= 23
                ? data.schedulerHour
                : computeSchedulerHour(timeZone || undefined, businessDayEndTime);

            summary[identity.storeId] = {
                storeId: identity.storeId,
                tId: identity.tId,
                businessType,
                businessCategory,
                active: typeof data.active === 'boolean' ? data.active : true,
                blocked: data.blocked === true,
                tenantBlocked: data.tenantBlocked === true,
                name: typeof data.name === 'string' ? data.name : '',
                tenantName: typeof data.tenantName === 'string' ? data.tenantName : '',
                subdomain: typeof data.subdomain === 'string' ? data.subdomain : '',
                isMaster: data.isMaster === true,
                outletSlug: typeof data.outletSlug === 'string' ? data.outletSlug : '',
                city: typeof data.city === 'string' ? data.city : '',
                addressLine: typeof data.addressLine === 'string' ? data.addressLine : '',
                logo: typeof data.logo === 'string' ? data.logo : '',
                timeZone,
                businessDayEndTime,
                schedulerHour,
                activePlanType: typeof data.activePlanType === 'string' ? data.activePlanType : null,
                ...(data.modifiedOn !== undefined ? { modifiedOn: data.modifiedOn } : {}),
            };
        }

        if (invalidIdentityCount > 0) {
            throw new HttpsError('failed-precondition', 'Canonical store identity validation failed.');
        }

        const payloadBytes = Buffer.byteLength(JSON.stringify({ stores: summary }), 'utf8');
        if (payloadBytes > STORES_SUMMARY_BACKFILL_MAX_PAYLOAD_BYTES) {
            throw new HttpsError('resource-exhausted', 'Stores summary payload exceeds the bounded write limit.');
        }

        await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').set({
            lastUpdated: FieldValue.serverTimestamp(),
            stores: summary,
        }, { merge: true });

        logger.info('[backfillStoresSummary] Completed', {
            payloadBytes,
            storesCount: storesSnapshot.size,
        });

        return {
            status: 'success',
            storesCount: storesSnapshot.size,
            message: `Successfully backfilled ${storesSnapshot.size} stores to storesSummary`,
        };
    } catch (error: any) {
        logger.error('[backfillStoresSummary] Failed', {
            failureCode: OPERATIONS_BACKFILL_STORES_SUMMARY_FAILED,
            ...getOperationsCallLogContext({
                requesterUid: request.auth?.uid,
            }),
            ...getOperationsErrorContext(error),
        });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', BACKFILL_STORES_SUMMARY_FAILED_MESSAGE);
    }
});
