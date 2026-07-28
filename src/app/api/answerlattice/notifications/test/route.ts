export const dynamic = 'force-dynamic';

/**
 * Answerlattice Notification Test
 *
 * Sends one verification email to the workspace support inbox. This gives a
 * self-sell buyer a concrete "notifications work" check without creating a
 * fake ticket or scanning notification logs.
 */

import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { isAnswerlatticeStoreInScope, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { getNotificationReadiness, sendNotification } from '@lib/notifications';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const AnswerlatticeNotificationRecipientSchema = z.string().trim().email().max(320);
const ANSWERLATTICE_NOTIFICATION_TEST_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
} as const;

const notificationTestJson = (
    body: Record<string, unknown>,
    status = 200,
): NextResponse => NextResponse.json(body, {
    status,
    headers: ANSWERLATTICE_NOTIFICATION_TEST_RESPONSE_HEADERS,
});

const withNotificationTestHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(ANSWERLATTICE_NOTIFICATION_TEST_RESPONSE_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
};

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
};

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
    if (!answerlatticeScope) return null;

    const tenantId = Number(answerlatticeScope.tenantId);
    const storeId = Number(answerlatticeScope.storeId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) return null;
    return { tenantId, storeId };
};

export const POST = withAuth(async (request: NextRequest, session) => {
    const scope = resolveSessionScope(session);
    if (!scope) {
        return notificationTestJson({ error: 'Not onboarded' }, 400);
    }

    try {
        const rateLimitResult = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(
                'answerlattice-notification-test',
                session.uId,
                scope.tenantId,
                scope.storeId,
            ),
            limit: 3,
            window: 60 * 60,
            failClosedOnProviderError: true,
        });
        if (!rateLimitResult.allowed) {
            const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
            return notificationTestJson(
                {
                    error: providerUnavailable
                        ? 'Notification testing is temporarily unavailable. Try again later.'
                        : 'Too many test emails. Try again later.',
                },
                providerUnavailable ? 503 : 429,
            );
        }

        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS);
        if (permission.response) return withNotificationTestHeaders(permission.response);

        const db = getAnswerlatticeDb();
        if (!db) {
            return notificationTestJson({ error: 'Answerlattice Firebase is not configured' }, 503);
        }

        const readiness = getNotificationReadiness(PRODUCT_IDS.ANSWERLATTICE);
        if (!readiness.enabled) {
            return notificationTestJson({ error: 'Answerlattice notifications are not enabled', readiness }, 403);
        }
        if (!readiness.smtpConfigured) {
            return notificationTestJson({ error: 'SMTP sender is not configured', readiness }, 503);
        }

        const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get();
        if (!storeSnap.exists) {
            return notificationTestJson({ error: 'Store not found' }, 404);
        }

        const storeData = storeSnap.data() || {};
        if (!isAnswerlatticeStoreInScope(storeData, scope, storeSnap.id)) {
            return notificationTestJson({ error: 'Forbidden' }, 403);
        }

        const supportEmailResult = AnswerlatticeNotificationRecipientSchema.safeParse(storeData.supportEmail);
        if (!supportEmailResult.success) {
            return notificationTestJson({ error: 'Add a valid support email before testing notifications' }, 400);
        }
        const supportEmail = supportEmailResult.data;

        const sent = await sendNotification({
            productId: PRODUCT_IDS.ANSWERLATTICE,
            eventType: 'ANSWERLATTICE_NOTIFICATION_TEST',
            recipientEmail: supportEmail,
            recipientName: storeData.productName || storeData.companyName || 'there',
            referenceId: `notification-test-${scope.tenantId}-${scope.storeId}-${Date.now()}`,
            metadata: {
                tenantId: scope.tenantId,
                storeId: scope.storeId,
                productName: storeData.productName || storeData.name || 'your product',
                workspaceName: storeData.companyName || storeData.businessName || storeData.tenantName || 'Answerlattice workspace',
                sentAt: new Date().toISOString(),
            },
        });

        if (!sent) {
            return notificationTestJson({ error: 'Notification test could not be delivered. Check sender config and logs.', readiness }, 502);
        }

        return notificationTestJson({ sent: true, recipientEmail: supportEmail, readiness });
    } catch (error) {
        logRuntimeFailure('answerlattice_notification_test_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return notificationTestJson({ error: 'Failed to send test notification' }, 500);
    }
});
