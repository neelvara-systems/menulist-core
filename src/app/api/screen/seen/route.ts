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
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { getPublicStoreById } from "@lib/firestore/clientStoreLookup";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getBoundedScreenStringContext, logScreenDisplayFailure } from "@lib/screen/screenDiagnostics";
import { readBoundedJsonBody, rejectInvalidOrOversizedDeclaredBody } from "@lib/security/boundedRequestBody";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getClientIp, hashPublicRateLimitValue } from "src/middleware/publicApi";

const TOKEN_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const SCREEN_TOKEN_PATTERN = /^[a-z0-9_-]{6,24}$/i;
const STORE_ID_PATTERN = /^\d+$/;
const SCREEN_SEEN_MAX_BODY_BYTES = 1024;
const CAMPAIGNS_SUMMARY_ID_PATTERN = /^campaigns_(\d+)$/;

const cachedSeenResponse = () => NextResponse.json({ ok: true, cached: true });

const getUtcDateKey = (value: unknown): string | null => {
    const date =
        value && typeof (value as any).toDate === 'function'
            ? (value as any).toDate()
            : value instanceof Date
                ? value
                : typeof value === 'string' || typeof value === 'number'
                    ? new Date(value)
                    : null;

    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
};

const getEligiblePublicScreenStore = async (storeId: string) => {
    if (!STORE_ID_PATTERN.test(storeId)) return null;
    return getPublicStoreById(storeId);
};

export async function POST(request: NextRequest) {
    let logContext: Record<string, boolean | number | string | null | undefined> = {
        endpoint: '/api/screen/seen',
    };

    try {
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
            return cachedSeenResponse();
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
            return cachedSeenResponse();
        }

        const summaryRef = firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY);
        let docRef;

        if (normalizedStoreId) {
            // OPTIMIZATION: Direct doc lookup instead of query (no index scan)
            const directRef = summaryRef.doc(`campaigns_${normalizedStoreId}`);
            const docSnap = await directRef.get();
            const screen = docSnap.data()?.screen;

            // Security: verify token matches to prevent spoofing
            if (!docSnap.exists || screen?.screenToken !== token || screen?.enabled !== true) {
                return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
            }

            const store = await getEligiblePublicScreenStore(normalizedStoreId);
            if (!store) {
                return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
            }

            const lastSeenDate = getUtcDateKey(screen?.screenLastSeenAt);
            const todayDate = new Date().toISOString().slice(0, 10);
            if (lastSeenDate === todayDate) {
                return cachedSeenResponse();
            }

            docRef = directRef;
        } else {
            // Fallback: query by token (backwards compatibility)
            const snapshot = await summaryRef.where('screen.screenToken', '==', token).limit(1).get();
            if (snapshot.empty) {
                return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
            }

            const docSnap = snapshot.docs[0];
            const docIdMatch = docSnap.id.match(CAMPAIGNS_SUMMARY_ID_PATTERN);
            const legacyStoreId = docIdMatch?.[1] || '';
            const screen = docSnap.data()?.screen;
            if (!legacyStoreId || screen?.enabled !== true) {
                return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
            }

            const store = await getEligiblePublicScreenStore(legacyStoreId);
            if (!store) {
                return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
            }

            const lastSeenDate = getUtcDateKey(screen?.screenLastSeenAt);
            const todayDate = new Date().toISOString().slice(0, 10);
            if (lastSeenDate === todayDate) {
                return cachedSeenResponse();
            }

            docRef = docSnap.ref;
        }

        // Update screenLastSeenAt (one write)
        await docRef.update({
            'screen.screenLastSeenAt': FieldValue.serverTimestamp()
        });

        logger.info('[Screen Seen] Daily signal recorded', {
            directStoreLookup: Boolean(normalizedStoreId),
            ...getBoundedScreenStringContext('storeId', normalizedStoreId),
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        logScreenDisplayFailure('screen_seen_route_failed', error, logContext);
        // Return success anyway - don't break screen for ops signal
        return NextResponse.json({ ok: true, error: 'logged' });
    }
}
