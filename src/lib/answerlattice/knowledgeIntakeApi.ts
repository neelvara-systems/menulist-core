import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { normalizeAnswerlatticeSubscriptionId } from '@lib/answerlattice/billingDocumentIdBoundary';
import {
    getAnswerlatticeSecurityLogContext,
    getBoundedAnswerlatticeStringContext,
} from '@lib/answerlattice/diagnostics';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { NextRequest, NextResponse } from 'next/server';

export type AnswerlatticeIntakeApiContext = {
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

const ANSWERLATTICE_KNOWLEDGE_INTAKE_CLIENT_ERROR_PATTERNS = [
    /^Answerlattice knowledge intake is not enabled\.$/,
    /^Answerlattice workspace is not available\.$/,
    /^An active Answerlattice beta or subscription is required before importing sources\.$/,
    /^An active Answerlattice subscription is required before running paid intake processing\.$/,
    /^Not enough Answerlattice support credits for this (?:operation|intake processing step)\.$/,
    /^Knowledge intake job not found\.$/,
    /^Knowledge intake job is not available\.$/,
    /^This intake job can no longer accept new sources\.$/,
    /^One intake job can hold up to \d+ sources\.$/,
    /^Repeated reply import is not enabled\.$/,
    /^Screenshot and media extraction is not enabled\.$/,
    /^Use a supported image, audio, or video file\.$/,
    /^The uploaded file is empty\.$/,
    /^File is too large for intake extraction\. Limit is \d+MB\.$/,
    /^No support-relevant text was extracted from this file\.$/,
    /^Review item not found\.$/,
    /^Review item is not available\.$/,
    /^Review item is not available for this intake job\.$/,
    /^Published review items cannot be edited from intake\.$/,
    /^Published status is set only by the publish action\.$/,
    /^Use a valid review item status\.$/,
    /^Use a valid review item target\.$/,
    /^Changelog entries are owner-managed\. Use (?:release notes as source context, not as an intake publish target|the Changelog screen to publish release notes)\.$/,
    /^Add at least one related entity before (?:accepting|publishing) a canonical answer proposal\.$/,
    /^Add at least one source with readable text before generating drafts\.$/,
    /^Accept at least one review item before publishing\.$/,
    /^Publish up to \d+ items at a time\.$/,
    /^Add one repeated question and a reusable answer before importing a repeated reply\.$/,
    /^File signature does not match a supported intake media type\.$/,
    /^Use a valid public http\(s\) URL\.$/,
    /^Private or local URLs cannot be imported\.$/,
    /^URL resolves to a private network address\.$/,
    /^URL redirected too many times\.$/,
    /^URL is not a text page that Answerlattice can import\.$/,
    /^URL content is too large for bounded intake\.$/,
    /^URL (?:intake|discovery) is not enabled\.$/,
];

export function getAnswerlatticeKnowledgeIntakeErrorStatus(error: unknown): number {
    if (!(error instanceof Error)) return 500;
    const message = error.message.toLowerCase();
    const urlStatusMatch = message.match(/^url returned (\d{3})/);
    if (urlStatusMatch) {
        return Number(urlStatusMatch[1]) >= 500 ? 502 : 400;
    }
    if (message.includes('not found')) return 404;
    if (message.includes('not enough answerlattice support credits') || message.includes('active answerlattice subscription')) return 402;
    if (message.includes('not available') || message.includes('active answerlattice beta or subscription')) return 403;
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

export function getAnswerlatticeKnowledgeIntakeClientErrorMessage(error: unknown, fallback: string): string {
    const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
    if (status >= 500 || !(error instanceof Error)) return fallback;
    const message = String(error.message || '').replace(/\s+/g, ' ').trim();
    if (!message) return fallback;
    return ANSWERLATTICE_KNOWLEDGE_INTAKE_CLIENT_ERROR_PATTERNS.some(pattern => pattern.test(message))
        ? message
        : fallback;
}

export async function requireAnswerlatticeKnowledgeIntakeContext(
    request: NextRequest,
    session: any,
    options: {
        rateLimitKey?: string;
        rateLimit?: number;
        rateWindow?: number;
        requireActiveLicense?: boolean;
    } = {},
): Promise<{ context: AnswerlatticeIntakeApiContext; response?: never } | { context?: never; response: NextResponse }> {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE) {
        return { response: NextResponse.json({ error: 'Answerlattice knowledge intake is not enabled.' }, { status: 404 }) };
    }

    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE);
    if (permission.response) return { response: permission.response };

    const scope = resolveAnswerlatticeSessionScope(session);
    const tId = Number(scope?.tenantId);
    const sId = Number(scope?.storeId);
    if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
        return { response: NextResponse.json({ error: 'Answerlattice workspace is not available.' }, { status: 400 }) };
    }

    if (options.requireActiveLicense) {
        const license = await hasActiveAnswerlatticeLicense(tId, sId);
        if (license.allowed !== true) {
            return { response: NextResponse.json({ error: license.message }, { status: license.status }) };
        }
    }

    if (options.rateLimitKey && options.rateLimit && options.rateWindow) {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(options.rateLimitKey, tId, sId),
            limit: options.rateLimit,
            window: options.rateWindow,
        });
        if (!rateLimit.allowed) {
            const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
            logger.security('Rate Limit Exceeded - Answerlattice Knowledge Intake', {
                ...getAnswerlatticeSecurityLogContext(session, request, request.nextUrl.pathname, {
                    ...getBoundedAnswerlatticeStringContext('rateLimitKey', options.rateLimitKey),
                    ...getBoundedAnswerlatticeStringContext('tenantId', tId),
                    ...getBoundedAnswerlatticeStringContext('storeId', sId),
                }),
                limit: options.rateLimit,
                waitSeconds,
                window: options.rateWindow,
            }, 'medium');
            return {
                response: NextResponse.json(
                    {
                        error: 'Too many requests. Please wait before trying again.',
                        retryAfter: waitSeconds,
                        resetAt: rateLimit.resetAt,
                    },
                    {
                        headers: {
                            'Cache-Control': 'private, no-store',
                            'Retry-After': String(waitSeconds),
                            'X-RateLimit-Limit': String(options.rateLimit),
                            'X-RateLimit-Remaining': String(rateLimit.remaining),
                            'X-RateLimit-Reset': String(rateLimit.resetAt),
                        },
                        status: 429,
                    },
                ),
            };
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

async function hasActiveAnswerlatticeLicense(tId: number, sId: number): Promise<{ allowed: true } | { allowed: false; status: number; message: string }> {
    const db = answerlatticeFirestoreAdmin as any;
    if (!db || typeof db.collection !== 'function') {
        return { allowed: false, status: 503, message: 'Answerlattice Firebase is not configured.' };
    }

    const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(sId)).get();
    if (!storeSnap.exists) {
        return { allowed: false, status: 404, message: 'Answerlattice workspace is not available.' };
    }

    const storeData = storeSnap.data() || {};
    const storeTenantId = Number(storeData.tenantId || storeData.tId);
    if (Number.isFinite(storeTenantId) && storeTenantId !== Number(tId)) {
        return { allowed: false, status: 403, message: 'Answerlattice workspace is not available.' };
    }

    const storeSubscription = storeData.answerlatticeSubscription || {};
    if (hasActiveSubscriptionWindow(storeSubscription)) {
        return { allowed: true };
    }

    const summarySubscriptionId = String(storeSubscription.id || storeSubscription.providerSubscriptionId || '').trim();
    const normalizedSummarySubscriptionId = normalizeAnswerlatticeSubscriptionId(summarySubscriptionId);
    if (normalizedSummarySubscriptionId) {
        const subscriptionSnap = await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(normalizedSummarySubscriptionId).get();
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
        message: 'An active Answerlattice beta or subscription is required before importing sources.',
    };
}
