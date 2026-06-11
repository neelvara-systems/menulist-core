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
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

// Rate limit: prevent abuse (even though client-side also limits)
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const seenRequests = new Map<string, number>();
const SCREEN_TOKEN_PATTERN = /^[a-z0-9_-]{6,24}$/i;
const STORE_ID_PATTERN = /^\d+$/;

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

        // Simple rate limit per token (1 per hour max server-side)
        const lastSeen = seenRequests.get(token);
        if (lastSeen && Date.now() - lastSeen < RATE_LIMIT_WINDOW_MS) {
            // Already seen recently, skip write but return success
            return NextResponse.json({ ok: true, cached: true });
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
                seenRequests.set(token, Date.now());
                return NextResponse.json({ ok: true, cached: true });
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
                seenRequests.set(token, Date.now());
                return NextResponse.json({ ok: true, cached: true });
            }

            docRef = snapshot.docs[0].ref;
        }

        // Update screenLastSeenAt (one write)
        await docRef.update({
            'screen.screenLastSeenAt': FieldValue.serverTimestamp()
        });

        // Update rate limit map
        seenRequests.set(token, Date.now());

        // Cleanup old entries (prevent memory leak)
        if (seenRequests.size > 10000) {
            const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
            const entries = Array.from(seenRequests.entries());
            for (const [key, time] of entries) {
                if (time < cutoff) {
                    seenRequests.delete(key);
                }
            }
        }

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
