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
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

// Rate limit: prevent abuse (even though client-side also limits)
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const seenRequests = new Map<string, number>();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, storeId } = body;

        // Validate token
        if (!token || typeof token !== 'string' || token.length < 6 || token.length > 24) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        // Simple rate limit per token (1 per hour max server-side)
        const lastSeen = seenRequests.get(token);
        if (lastSeen && Date.now() - lastSeen < RATE_LIMIT_WINDOW_MS) {
            // Already seen recently, skip write but return success
            return NextResponse.json({ ok: true, cached: true });
        }

        const summaryRef = firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY);
        let docRef;

        if (storeId && typeof storeId === 'string') {
            // OPTIMIZATION: Direct doc lookup instead of query (no index scan)
            const directRef = summaryRef.doc(`campaigns_${storeId}`);
            const docSnap = await directRef.get();

            // Security: verify token matches to prevent spoofing
            if (!docSnap.exists || docSnap.data()?.screen?.screenToken !== token) {
                return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
            }
            docRef = directRef;
        } else {
            // Fallback: query by token (backwards compatibility)
            const snapshot = await summaryRef.where('screen.screenToken', '==', token).limit(1).get();
            if (snapshot.empty) {
                return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
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

        console.log(`[Screen Seen] Token: ${token.substring(0, 4)}*** at ${new Date().toISOString()}`);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[Screen Seen] Error:', error);
        // Return success anyway - don't break screen for ops signal
        return NextResponse.json({ ok: true, error: 'logged' });
    }
}
