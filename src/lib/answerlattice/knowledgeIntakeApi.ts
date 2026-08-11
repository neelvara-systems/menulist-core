import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS, requireAnswerlatticePermission, } from '@lib/answerlattice/accessControl';
import { normalizeAnswerlatticeSubscriptionId } from '@lib/answerlattice/billingDocumentIdBoundary';
import { projectActiveAnswerlatticeSubscriptionForRead } from '@lib/answerlattice/subscriptionReadBoundary';
import { getAnswerlatticeSecurityLogContext, getBoundedAnswerlatticeStringContext, } from '@lib/answerlattice/diagnostics';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { isAnswerlatticeStoreInScope, normalizeAnswerlatticeScopeDocumentId, resolveAnswerlatticeSessionScope, } from '@lib/answerlattice/sessionScope';
import { answerlatticeAdminApp, requireAnswerlatticeFirestoreAdmin, } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { getBoundedErrorStringField } from '@lib/monitoring/boundedLogContext';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { NextRequest, NextResponse } from 'next/server';

export function answerlatticeKnowledgeIntakeJson(
    body: unknown,
    init: ResponseInit = {},
): NextResponse {
    const headers = new Headers(init.headers);
    Object.entries(ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        headers.set(name, value);
    });
    return NextResponse.json(body, { ...init, headers });
}

export function withAnswerlatticeKnowledgeIntakePrivateHeaders<T extends NextResponse>(
    response: T,
): T {
    Object.entries(ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
}

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
    /^An active Answerlattice subscription is required before importing sources\.$/,
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
    /^Media extraction for this file is already running\.$/,
    /^Review item not found\.$/,
    /^Review item is not available\.$/,
    /^Review item is not available for this intake job\.$/,
    /^Published review items cannot be edited from intake\.$/,
    /^Review items cannot be edited while this intake job is publishing or complete\.$/,
    /^Published status is set only by the publish action\.$/,
    /^Use a valid review item status\.$/,
    /^Use a valid review item target\.$/,
    /^Changelog entries are owner-managed\. Use (?:release notes as source context, not as an intake publish target|the Changelog screen to publish release notes)\.$/,
    /^Add at least one related entity before (?:accepting|publishing) a canonical answer proposal\.$/,
    /^Add a supported answer before (?:accepting|publishing) a canonical answer proposal\.$/,
    /^Add at least one source with readable text before generating drafts\.$/,
    /^Knowledge intake analysis is already running\.$/,
    /^Product-specific starter packs are not enabled\.$/,
    /^Product-specific starter pack generation is already running\.$/,
    /^This intake job can no longer generate a product-specific starter pack\.$/,
    /^This intake job does not have room for another product-specific starter pack\.$/,
    /^Add at least one source with readable text before generating a product-specific starter pack\.$/,
    /^This intake job can no longer generate review drafts\.$/,
    /^Knowledge intake (?:source|review item) limit was exceeded\.$/,
    /^Accept at least one review item before publishing\.$/,
    /^Publish up to \d+ items at a time\.$/,
    /^Knowledge intake publishing is already running\.$/,
    /^This intake job can no longer publish review items\.$/,
    /^One or more selected review items are not available for publishing\.$/,
    /^Knowledge intake (?:article|FAQ) target conflicts with existing content\.$/,
    /^Knowledge intake canonical proposal conflicts with existing governance work\.$/,
    /^A product surface already exists for this route\. Review it before importing another\.$/,
    /^Add reviewed source evidence before accepting a canonical answer proposal\.$/,
    /^Review every linked source and resolve its conflicts before accepting this canonical answer proposal\.$/,
    /^Review every linked source and resolve its conflicts before publishing this canonical answer proposal\.$/,
    /^Only public sources can be publicly citable\.$/,
    /^Excluded or superseded sources must not be citable\.$/,
    /^Source review date cannot be before its effective date\.$/,
    /^A source cannot conflict with itself\.$/,
    /^Review every conflicting source before linking it\.$/,
    /^A conflicting source already has \d+ unresolved conflicts\.$/,
    /^Use a valid source governance request identifier\.$/,
    /^Use a valid source (?:governance date|authority|approval status|access scope|citation setting)\.$/,
    /^Knowledge base navigation is too large to add another imported article safely\.$/,
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
    if (message.includes('already running') || message.includes('conflicts') || message.includes('already exists')) return 409;
    if (message.includes('not enough answerlattice support credits') || message.includes('active answerlattice subscription')) return 402;
    if (message.includes('not available')) return 403;
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
        || message.includes('analysis is already running')
        || message.includes('does not have room for another product-specific starter pack')
        || message.includes('can no longer generate review drafts')
        || message.includes('can no longer generate a product-specific starter pack')
        || message.includes('limit was exceeded')
        || message.includes('accept at least one review item')
        || message.includes('publish up to')
        || message.includes('publishing is already running')
        || message.includes('can no longer publish review items')
        || message.includes('not available for publishing')
        || message.includes('navigation is too large')
        || message.includes('published status')
        || message.includes('published review items')
        || message.includes('cannot be edited')
        || message.includes('can no longer accept new sources')
        || message.includes('one intake job can hold up to')
        || message.includes('no readable text')
        || message.includes('no support-relevant text')
        || message.includes('review every linked source')
        || message.includes('reviewed source evidence')
        || message.includes('publicly citable')
        || message.includes('must not be citable')
        || message.includes('review date')
        || message.includes('source cannot conflict with itself')
        || message.includes('conflicting source')
        || message.includes('source governance request identifier')
        || message.includes('valid source governance')
        || message.includes('valid source authority')
        || message.includes('valid source approval')
        || message.includes('valid source access')
        || message.includes('valid source citation')
    ) {
        return 400;
    }
    return 500;
}

export function getAnswerlatticeKnowledgeIntakeClientErrorMessage(error: unknown, fallback: string): string {
    const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
    if (status >= 500 || !(error instanceof Error)) return fallback;
    const message = (getBoundedErrorStringField(error, 'message', 500) || '').replace(/\s+/g, ' ').trim();
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
        return { response: answerlatticeKnowledgeIntakeJson({ error: 'Answerlattice knowledge intake is not enabled.' }, { status: 404 }) };
    }

    const scope = resolveAnswerlatticeSessionScope(session);
    const tId = normalizeAnswerlatticeScopeDocumentId(scope?.tenantId);
    const sId = normalizeAnswerlatticeScopeDocumentId(scope?.storeId);
    if (!tId || !sId) {
        return { response: answerlatticeKnowledgeIntakeJson({ error: 'Answerlattice workspace is not available.' }, { status: 400 }) };
    }
    const actorId = resolveCurrentSessionUserDocumentId(session);
    if (!actorId) {
        return { response: answerlatticeKnowledgeIntakeJson({ error: 'Forbidden' }, { status: 403 }) };
    }

    if (options.rateLimitKey && options.rateLimit && options.rateWindow) {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(options.rateLimitKey, actorId, tId, sId),
            limit: options.rateLimit,
            window: options.rateWindow,
            failClosedOnProviderError: true,
        });
        if (!rateLimit.allowed) {
            if (rateLimit.reason === 'provider_unavailable') {
                return {
                    response: answerlatticeKnowledgeIntakeJson(
                        { error: 'Knowledge Intake is temporarily unavailable. Please try again later.' },
                        { headers: { 'Cache-Control': 'private, no-store' }, status: 503 },
                    ),
                };
            }
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
                response: answerlatticeKnowledgeIntakeJson(
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

    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE);
    if (permission.response) {
        return { response: withAnswerlatticeKnowledgeIntakePrivateHeaders(permission.response) };
    }
    if (
        permission.access.scope.tenantId !== tId
        || permission.access.scope.storeId !== sId
    ) {
        return { response: answerlatticeKnowledgeIntakeJson({ error: 'Answerlattice workspace is not available.' }, { status: 403 }) };
    }

    if (options.requireActiveLicense) {
        const license = await hasActiveAnswerlatticeKnowledgeIntakeLicense(tId, sId);
        if (license.allowed !== true) {
            return { response: answerlatticeKnowledgeIntakeJson({ error: license.message }, { status: license.status }) };
        }
    }

    return {
        context: {
            scope: { tId, sId },
            actor: {
                id: actorId,
                name: session?.user?.name || session?.user?.email || null,
                email: session?.user?.email || null,
            },
        },
    };
}

export async function hasActiveAnswerlatticeKnowledgeIntakeLicense(tId: number, sId: number): Promise<{ allowed: true } | { allowed: false; status: number; message: string }> {
    if (!answerlatticeAdminApp) {
        return { allowed: false, status: 503, message: 'Answerlattice Firebase is not configured.' };
    }
    const storeSnap = await requireAnswerlatticeFirestoreAdmin().collection(DB_COLLECTIONS.STORES).doc(String(sId)).get();
    if (!storeSnap.exists) {
        return { allowed: false, status: 404, message: 'Answerlattice workspace is not available.' };
    }

    const storeData = storeSnap.data() || {};
    if (!isAnswerlatticeStoreInScope(storeData, { tenantId: tId, storeId: sId }, storeSnap.id)) {
        return { allowed: false, status: 403, message: 'Answerlattice workspace is not available.' };
    }

    const storeSubscription = storeData.answerlatticeSubscription || {};
    // The store copy is a denormalized display/read-model only. Paid access is
    // authorized from the server-owned subscription document below.
    const summarySubscriptionId = String(storeSubscription.id || storeSubscription.providerSubscriptionId || '').trim();
    const normalizedSummarySubscriptionId = normalizeAnswerlatticeSubscriptionId(summarySubscriptionId);
    if (normalizedSummarySubscriptionId) {
        const subscriptionSnap = await requireAnswerlatticeFirestoreAdmin().collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(normalizedSummarySubscriptionId).get();
        if (subscriptionSnap.exists) {
            if (projectActiveAnswerlatticeSubscriptionForRead(
                subscriptionSnap.data(),
                subscriptionSnap.id,
                tId,
                sId,
            )) {
                return { allowed: true };
            }
        }
    }

    const subscriptionSnap = await requireAnswerlatticeFirestoreAdmin().collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('productId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tenantId', '==', tId)
        .where('storeId', '==', sId)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .limit(5)
        .get();
    const activeSubscription = subscriptionSnap.docs
        .map(doc => projectActiveAnswerlatticeSubscriptionForRead(
            doc.data(),
            doc.id,
            tId,
            sId,
        ))
        .find(Boolean);
    if (activeSubscription) {
        return { allowed: true };
    }

    return {
        allowed: false,
        status: 402,
        message: 'An active Answerlattice subscription is required before importing sources.',
    };
}
