export const dynamic = 'force-dynamic';

/**
 * Canonica Notification Test
 *
 * Sends one verification email to the workspace support inbox. This gives a
 * self-sell buyer a concrete "notifications work" check without creating a
 * fake ticket or scanning notification logs.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { resolveCanonicaSessionScope } from '@lib/canonica/sessionScope';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { getNotificationReadiness, sendNotification } from '@lib/notifications';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/auth';

const getCanonicaDb = () => {
    const db = canonicaFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? canonicaFirestoreAdmin : null;
};

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const canonicaScope = resolveCanonicaSessionScope(session);
    if (!canonicaScope) return null;

    const tenantId = Number(canonicaScope.tenantId);
    const storeId = Number(canonicaScope.storeId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) return null;
    return { tenantId, storeId };
};

export const POST = withAuth(async (_request: NextRequest, session) => {
    const scope = resolveSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }

    const db = getCanonicaDb();
    if (!db) {
        return NextResponse.json({ error: 'Canonica Firebase is not configured' }, { status: 503 });
    }

    const readiness = getNotificationReadiness(PRODUCT_IDS.CANONICA);
    if (!readiness.enabled) {
        return NextResponse.json({ error: 'Canonica notifications are not enabled', readiness }, { status: 403 });
    }
    if (!readiness.smtpConfigured) {
        return NextResponse.json({ error: 'SMTP sender is not configured', readiness }, { status: 503 });
    }

    try {
        const rateLimitResult = await checkRateLimit({
            key: `canonica-notification-test:${scope.storeId}`,
            limit: 3,
            window: 60 * 60,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many test emails. Try again later.' }, { status: 429 });
        }

        const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get();
        if (!storeSnap.exists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        const storeData = storeSnap.data() || {};
        const storeTenantId = Number(storeData.tenantId || storeData.tId);
        if (Number.isFinite(storeTenantId) && storeTenantId !== scope.tenantId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const supportEmail = typeof storeData.supportEmail === 'string' ? storeData.supportEmail.trim() : '';
        if (!supportEmail || !supportEmail.includes('@')) {
            return NextResponse.json({ error: 'Add a valid support email before testing notifications' }, { status: 400 });
        }

        const sent = await sendNotification({
            productId: PRODUCT_IDS.CANONICA,
            eventType: 'CANONICA_NOTIFICATION_TEST',
            recipientEmail: supportEmail,
            recipientName: storeData.productName || storeData.companyName || 'there',
            referenceId: `notification-test-${scope.tenantId}-${scope.storeId}-${Date.now()}`,
            skipDedup: true,
            metadata: {
                productName: storeData.productName || storeData.name || 'your product',
                workspaceName: storeData.companyName || storeData.businessName || storeData.tenantName || 'Canonica workspace',
                sentAt: new Date().toLocaleString(),
            },
        });

        if (!sent) {
            return NextResponse.json({ error: 'Notification test could not be delivered. Check sender config and logs.', readiness }, { status: 502 });
        }

        return NextResponse.json({ sent: true, recipientEmail: supportEmail, readiness });
    } catch (error) {
        secureError('[Canonica Notifications] Test email failed', error as Error, {
            tenantId: scope.tenantId,
            storeId: scope.storeId,
        });
        return NextResponse.json({ error: 'Failed to send test notification' }, { status: 500 });
    }
});
