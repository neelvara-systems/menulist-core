import { FEATURE_FLAGS } from '@config/features';
import { CANONICA_PERMISSION_KEYS } from '@constant/canonica/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { requireCanonicaPermission } from '@lib/canonica/accessControl';
import { resolveCanonicaSessionScope } from '@lib/canonica/sessionScope';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { NextRequest, NextResponse } from 'next/server';

export type CanonicaIntakeApiContext = {
    scope: {
        tId: number;
        sId: number;
    };
    actor: {
        id?: string | number | null;
        name?: string | null;
        email?: string | null;
    };
};

export function getCanonicaKnowledgeIntakeErrorStatus(error: unknown): number {
    if (!(error instanceof Error)) return 500;
    const message = error.message.toLowerCase();
    if (message.includes('not found')) return 404;
    if (message.includes('not enough canonica support credits') || message.includes('active canonica subscription')) return 402;
    if (message.includes('not available') || message.includes('active canonica beta or subscription')) return 403;
    if (message.includes('too large')) return 413;
    if (
        message.includes('not enabled')
        || message.includes('valid public')
        || message.includes('private or local')
        || message.includes('private network')
        || message.includes('redirect')
        || message.includes('not a text page')
        || message.includes('valid review item')
        || message.includes('valid intake')
        || message.includes('valid media')
        || message.includes('file signature')
        || message.includes('uploaded file is empty')
        || message.includes('add at least one source')
        || message.includes('accept at least one review item')
        || message.includes('publish up to')
        || message.includes('published status')
        || message.includes('published review items')
        || message.includes('can no longer accept new sources')
        || message.includes('one intake job can hold up to')
        || message.includes('no readable text')
        || message.includes('no support-relevant text')
    ) {
        return 400;
    }
    return 500;
}

export async function requireCanonicaKnowledgeIntakeContext(
    request: NextRequest,
    session: any,
    options: {
        rateLimitKey?: string;
        rateLimit?: number;
        rateWindow?: number;
        requireActiveLicense?: boolean;
    } = {},
): Promise<{ context: CanonicaIntakeApiContext; response?: never } | { context?: never; response: NextResponse }> {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_KNOWLEDGE_INTAKE) {
        return { response: NextResponse.json({ error: 'Canonica knowledge intake is not enabled.' }, { status: 404 }) };
    }

    const permission = await requireCanonicaPermission(request, session, CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE);
    if (permission.response) return { response: permission.response };

    const scope = resolveCanonicaSessionScope(session);
    const tId = Number(scope?.tenantId);
    const sId = Number(scope?.storeId);
    if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
        return { response: NextResponse.json({ error: 'Canonica workspace is not available.' }, { status: 400 }) };
    }

    if (options.requireActiveLicense) {
        const license = await hasActiveCanonicaLicense(tId, sId);
        if (license.allowed !== true) {
            return { response: NextResponse.json({ error: license.message }, { status: license.status }) };
        }
    }

    if (options.rateLimitKey && options.rateLimit && options.rateWindow) {
        const rateLimit = await checkRateLimit({
            key: `${options.rateLimitKey}:${tId}:${sId}`,
            limit: options.rateLimit,
            window: options.rateWindow,
        });
        if (!rateLimit.allowed) {
            return { response: NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 }) };
        }
    }

    return {
        context: {
            scope: { tId, sId },
            actor: {
                id: session?.uId || session?.user?.id || null,
                name: session?.user?.name || session?.user?.email || null,
                email: session?.user?.email || null,
            },
        },
    };
}

const toMillis = (value: any): number | null => {
    if (!value) return null;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    if (typeof value.seconds === 'number') {
        return value.seconds * 1000;
    }
    return null;
};

const hasActiveSubscriptionWindow = (subscription: Record<string, any> | null | undefined): boolean => {
    if (!subscription || typeof subscription !== 'object') return false;
    const status = String(subscription.status || '').toLowerCase();
    if (!['active', 'trialing'].includes(status)) return false;

    const endMs = toMillis(subscription.subscriptionEndDate || subscription.cycleEndDate || subscription.currentPeriodEnd);
    if (!endMs) return true;
    return endMs > Date.now();
};

async function hasActiveCanonicaLicense(tId: number, sId: number): Promise<{ allowed: true } | { allowed: false; status: number; message: string }> {
    const db = canonicaFirestoreAdmin as any;
    if (!db || typeof db.collection !== 'function') {
        return { allowed: false, status: 503, message: 'Canonica Firebase is not configured.' };
    }

    const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(sId)).get();
    if (!storeSnap.exists) {
        return { allowed: false, status: 404, message: 'Canonica workspace is not available.' };
    }

    const storeData = storeSnap.data() || {};
    const storeTenantId = Number(storeData.tenantId || storeData.tId);
    if (Number.isFinite(storeTenantId) && storeTenantId !== Number(tId)) {
        return { allowed: false, status: 403, message: 'Canonica workspace is not available.' };
    }

    const storeSubscription = storeData.canonicaSubscription || {};
    if (hasActiveSubscriptionWindow(storeSubscription)) {
        return { allowed: true };
    }

    const summarySubscriptionId = String(storeSubscription.id || storeSubscription.providerSubscriptionId || '').trim();
    if (summarySubscriptionId) {
        const subscriptionSnap = await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(summarySubscriptionId).get();
        if (subscriptionSnap.exists) {
            const subscription = subscriptionSnap.data() || {};
            const subscriptionTenantId = Number(subscription.tId || subscription.tenantId);
            const subscriptionStoreId = Number(subscription.sId || subscription.storeId);
            if (
                subscriptionTenantId === Number(tId)
                && subscriptionStoreId === Number(sId)
                && hasActiveSubscriptionWindow(subscription)
            ) {
                return { allowed: true };
            }
        }
    }

    const subscriptionSnap = await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .where('tenantId', '==', Number(tId))
        .where('storeId', '==', Number(sId))
        .limit(5)
        .get();
    const activeSubscription = subscriptionSnap.docs
        .map(doc => ({ id: doc.id, ...(doc.data() || {}) }))
        .find((subscription: Record<string, any>) => (
            Number(subscription.tId || subscription.tenantId) === Number(tId)
            && Number(subscription.sId || subscription.storeId) === Number(sId)
            && hasActiveSubscriptionWindow(subscription)
        ));
    if (activeSubscription) {
        return { allowed: true };
    }

    return {
        allowed: false,
        status: 402,
        message: 'An active Canonica beta or subscription is required before importing sources.',
    };
}
