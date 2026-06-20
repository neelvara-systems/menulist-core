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
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "src/middleware/publicApi";

const TOKEN_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const SCREEN_TOKEN_PATTERN = /^[a-z0-9_-]{6,24}$/i;
const STORE_ID_PATTERN = /^\d+$/;

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

export async function POST(request: NextRequest) {
    try {
        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const token = typeof body.token === 'string' ? body.token.trim() : '';
        const rawStoreId = body.storeId;
        const normalizedStoreId = typeof rawStoreId === 'string' || typeof rawStoreId === 'number'
            ? String(rawStoreId).trim()
            : '';

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

        const ipRateConfig = getRateLimitForFeature('SCREEN_SEEN_SIGNAL');
        const ipRateLimit = await checkRateLimit({
            key: `screen-seen:ip:${getClientIp(request)}`,
            ...ipRateConfig,
        });
        if (!ipRateLimit.allowed) {
            return cachedSeenResponse();
        }

        const tokenRateLimit = await checkRateLimit({
            key: `screen-seen:token:${normalizedStoreId || 'legacy'}:${token}`,
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

            // Security: verify token matches to prevent spoofing
            if (!docSnap.exists || docSnap.data()?.screen?.screenToken !== token) {
                return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
            }

            const lastSeenDate = getUtcDateKey(docSnap.data()?.screen?.screenLastSeenAt);
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

            const lastSeenDate = getUtcDateKey(snapshot.docs[0].data()?.screen?.screenLastSeenAt);
            const todayDate = new Date().toISOString().slice(0, 10);
            if (lastSeenDate === todayDate) {
                return cachedSeenResponse();
            }

            docRef = snapshot.docs[0].ref;
        }

        // Update screenLastSeenAt (one write)
        await docRef.update({
            'screen.screenLastSeenAt': FieldValue.serverTimestamp()
        });

        logger.info('[Screen Seen] Daily signal recorded', {
            directStoreLookup: Boolean(normalizedStoreId),
            storeId: normalizedStoreId || undefined,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        logger.error('[Screen Seen] Error', error);
        // Return success anyway - don't break screen for ops signal
        return NextResponse.json({ ok: true, error: 'logged' });
    }
}
