export const dynamic = 'force-dynamic';
/**
 * Screen Daily Seen Signal API
 * 
 * NOT a heartbeat - just ONE write per day per screen
 * Provides operational awareness without per-minute cost
 * 
 * Per ChatGPT validation: "Cold Signal Ping"
 * - At most ONE write per screen per day
 * - Gives daily liveness signal
 * - Store-level uptime tracking
 * - Churn early warning
 * - Sales proof later
 */

import { DB_COLLECTIONS } from "@constant/database";
import { FEATURE_FLAGS } from "@config/features";
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { normalizeStorePermissionScopeDocumentId } from "@lib/permissions/scopeDocumentId";
import { normalizeMenuListPublicEntityIdentityAliases } from "@lib/publicTruth/entityEligibility";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getBoundedScreenStringContext, logScreenDisplayFailure } from "@lib/screen/screenDiagnostics";
import {
    isCurrentScreenSeenPublicScope,
    resolveUniqueLegacyScreenSeenStoreId,
} from "@lib/screen/screenSeenScope";
import { readBoundedJsonBody, rejectInvalidOrOversizedDeclaredBody } from "@lib/security/boundedRequestBody";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getClientIp, hashPublicRateLimitValue } from "src/middleware/publicApi";

const TOKEN_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const SCREEN_TOKEN_PATTERN = /^[a-z0-9_-]{6,24}$/i;
const STORE_ID_PATTERN = /^\d+$/;
const SCREEN_SEEN_MAX_BODY_BYTES = 1024;

const cachedSeenResponse = () => NextResponse.json({ ok: true, cached: true });
const rateLimitedSeenResponse = () => NextResponse.json(
    { error: 'Temporarily unavailable' },
    {
        status: 429,
        headers: { 'Retry-After': String(TOKEN_RATE_LIMIT_WINDOW_SECONDS) },
    },
);

const getUtcDateKey = (value: unknown): string | null => {
    const timestampLike = value && typeof value === 'object' && 'toDate' in value
        ? value as { toDate?: unknown }
        : null;
    const date =
        timestampLike && typeof timestampLike.toDate === 'function'
            ? timestampLike.toDate()
            : value instanceof Date
                ? value
                : typeof value === 'string' || typeof value === 'number'
                    ? new Date(value)
                    : null;

    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
};

type ScreenSeenCommitResult = 'already_seen' | 'ineligible' | 'recorded';

const commitCurrentScreenSeen = async (params: {
    screenRef: FirebaseFirestore.DocumentReference;
    storeId: string;
    token: string;
}): Promise<ScreenSeenCommitResult> => {
    const storeScope = normalizeStorePermissionScopeDocumentId(params.storeId);
    if (!storeScope) return 'ineligible';
    const storeRef = firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId);

    return firestoreAdmin.runTransaction(async (transaction) => {
        const [screenSnapshot, storeSnapshot] = await Promise.all([
            transaction.get(params.screenRef),
            transaction.get(storeRef),
        ]);
        const screen = screenSnapshot.data()?.screen;
        const storeData = storeSnapshot.data();
        const tenantScope = normalizeMenuListPublicEntityIdentityAliases([
            storeData?.tenantId,
            storeData?.tId,
        ]);
        if (
            !screenSnapshot.exists
            || screen?.screenToken !== params.token
            || screen?.enabled !== true
            || !tenantScope
        ) {
            return 'ineligible';
        }

        const tenantRef = firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc(tenantScope.documentId);
        const tenantSnapshot = await transaction.get(tenantRef);
        if (!isCurrentScreenSeenPublicScope({
            storeData,
            storeDocumentId: storeScope.documentId,
            tenantData: tenantSnapshot.data(),
            tenantDocumentId: tenantScope.documentId,
        })) {
            return 'ineligible';
        }

        const lastSeenDate = getUtcDateKey(screen.screenLastSeenAt);
        const todayDate = new Date().toISOString().slice(0, 10);
        if (lastSeenDate === todayDate) return 'already_seen';

        transaction.update(params.screenRef, {
            'screen.screenLastSeenAt': FieldValue.serverTimestamp(),
        });
        return 'recorded';
    });
};

export async function POST(request: NextRequest) {
    let logContext: Record<string, boolean | number | string | null | undefined> = {
        endpoint: '/api/screen/seen',
    };

    try {
        if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED) {
            return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
        }

        const declaredBodyResponse = rejectInvalidOrOversizedDeclaredBody(request, SCREEN_SEEN_MAX_BODY_BYTES, {
            invalidRequestMessage: 'Invalid request',
            tooLargeMessage: 'Invalid request',
        });
        if (declaredBodyResponse) return declaredBodyResponse;

        const ipRateConfig = getRateLimitForFeature('SCREEN_SEEN_SIGNAL');
        const ipHash = hashPublicRateLimitValue(getClientIp(request));
        const ipRateLimit = await checkRateLimit({
            key: `screen-seen:ip:${ipHash}`,
            ...ipRateConfig,
        });
        if (!ipRateLimit.allowed) {
            return rateLimitedSeenResponse();
        }

        const bodyResult = await readBoundedJsonBody(request, SCREEN_SEEN_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid request',
            invalidRequestMessage: 'Invalid request',
            tooLargeMessage: 'Invalid request',
        });
        if (bodyResult.ok === false) return bodyResult.response;

        const body = bodyResult.data && typeof bodyResult.data === 'object'
            ? bodyResult.data as Record<string, unknown>
            : {};

        const token = typeof body.token === 'string' ? body.token.trim() : '';
        const rawStoreId = body.storeId;
        const normalizedStoreId = typeof rawStoreId === 'string' || typeof rawStoreId === 'number'
            ? String(rawStoreId).trim()
            : '';
        logContext = {
            ...logContext,
            directStoreLookup: Boolean(normalizedStoreId),
            ...getBoundedScreenStringContext('screenToken', token),
            ...getBoundedScreenStringContext('storeId', normalizedStoreId),
        };

        // Validate token
        if (!SCREEN_TOKEN_PATTERN.test(token)) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        if (rawStoreId != null && typeof rawStoreId !== 'string' && typeof rawStoreId !== 'number') {
            return NextResponse.json({ error: 'Invalid store' }, { status: 400 });
        }

        if (rawStoreId != null && normalizedStoreId && !STORE_ID_PATTERN.test(normalizedStoreId)) {
            return NextResponse.json({ error: 'Invalid store' }, { status: 400 });
        }

        const screenTokenHash = hashPublicRateLimitValue(token);
        const storeHashSegment = normalizedStoreId
            ? `store:${hashPublicRateLimitValue(normalizedStoreId)}`
            : 'legacy';
        const tokenRateLimit = await checkRateLimit({
            key: `screen-seen:token:${storeHashSegment}:${screenTokenHash}`,
            limit: 1,
            window: TOKEN_RATE_LIMIT_WINDOW_SECONDS,
        });
        if (!tokenRateLimit.allowed) {
            return rateLimitedSeenResponse();
        }

        const summaryRef = firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY);
        let docRef: FirebaseFirestore.DocumentReference;
        let targetStoreId: string;

        if (normalizedStoreId) {
            docRef = summaryRef.doc(`campaigns_${normalizedStoreId}`);
            targetStoreId = normalizedStoreId;
        } else {
            // Fallback: query by token (backwards compatibility)
            const snapshot = await summaryRef.where('screen.screenToken', '==', token).limit(2).get();
            const legacyStoreId = resolveUniqueLegacyScreenSeenStoreId(
                snapshot.docs.map((candidate) => candidate.id),
            );
            if (!legacyStoreId) {
                return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
            }

            const docSnap = snapshot.docs[0];
            docRef = docSnap.ref;
            targetStoreId = legacyStoreId;
        }

        const commitResult = await commitCurrentScreenSeen({
            screenRef: docRef,
            storeId: targetStoreId,
            token,
        });
        if (commitResult === 'ineligible') {
            return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
        }
        if (commitResult === 'already_seen') return cachedSeenResponse();

        logger.info('[Screen Seen] Daily signal recorded', {
            directStoreLookup: Boolean(normalizedStoreId),
            ...getBoundedScreenStringContext('storeId', targetStoreId),
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        logScreenDisplayFailure('screen_seen_route_failed', error, logContext);
        // The display request is fire-and-forget, so a retryable response keeps
        // a transient failure from being cached as today's successful signal.
        return NextResponse.json({ error: 'Temporarily unavailable' }, { status: 503 });
    }
}
