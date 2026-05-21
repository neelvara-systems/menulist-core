export const dynamic = 'force-dynamic';

/**
 * Canonica Activation Summary
 *
 * Cost-optimized management read model. This route reads the store document and
 * compact platformSummary docs; it does not scan KB, tickets, changelog, or
 * product surface collections.
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import {
    buildCanonicaActivationSummary,
    getCanonicaActivationSummaryDocId,
    shouldPersistActivationSummary,
} from '@lib/canonica/activationSummary';
import { getContextContentSummaryDocId } from '@lib/canonica/productSurfaceContent';
import { resolveCanonicaSessionScope } from '@lib/canonica/sessionScope';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { admin } from '@lib/firebase/firebaseAdmin';
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

const readLegacySubscription = async (db: any, tId: number, sId: number) => {
    const snapshot = await db
        .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .where('storeId', '==', sId)
        .limit(5)
        .get();

    const match = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))
        .find((data: any) => {
            const tenantMatches = Number(data.tenantId || data.tId) === tId;
            const productMatches = !data.productId || data.productId === 'CN' || data.pId === 'CN' || data.onboardingSource === 'CANONICA_ONBOARDING';
            return tenantMatches && productMatches;
        });

    return match || null;
};

export const GET = withAuth(async (_request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_ACTIVATION_COMMAND_CENTER) {
        return NextResponse.json({ error: 'Activation summary is not enabled.' }, { status: 403 });
    }

    const scope = resolveSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }

    const db = getCanonicaDb();
    if (!db) {
        return NextResponse.json({ error: 'Canonica Firebase is not configured' }, { status: 503 });
    }

    const { tenantId: tId, storeId: sId } = scope;

    try {
        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(sId));
        const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getCanonicaActivationSummaryDocId(tId, sId));
        const contextRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getContextContentSummaryDocId(tId, sId));
        const coverageRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`coverage_${tId}_${sId}`);
        const trustRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`trustMetrics_${tId}_${sId}`);

        const [storeSnap, existingSummarySnap, contextSnap, coverageSnap, trustSnap] = await Promise.all([
            storeRef.get(),
            summaryRef.get(),
            contextRef.get(),
            coverageRef.get(),
            trustRef.get(),
        ]);

        if (!storeSnap.exists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        const storeData = storeSnap.data() || {};
        const storeTenantId = Number(storeData.tenantId || storeData.tId);
        if (Number.isFinite(storeTenantId) && storeTenantId !== tId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const usedLegacySubscriptionFallback = !storeData.canonicaSubscription;
        const legacySubscription = usedLegacySubscriptionFallback
            ? await readLegacySubscription(db, tId, sId)
            : null;

        const summary = buildCanonicaActivationSummary({
            tId,
            sId,
            storeData,
            subscription: legacySubscription,
            contextSummary: contextSnap.exists ? contextSnap.data() as any : null,
            coverage: coverageSnap.exists ? coverageSnap.data() as any : null,
            trustMetrics: trustSnap.exists ? trustSnap.data() as any : null,
        });

        const existingSummary = existingSummarySnap.exists ? existingSummarySnap.data() || null : null;
        if (shouldPersistActivationSummary(existingSummary, summary)) {
            await summaryRef.set({
                ...summary,
                lastComputedAt: admin.firestore.FieldValue.serverTimestamp(),
                source: 'activation_summary_api',
            }, { merge: true });
        }

        return NextResponse.json({
            summary: {
                ...summary,
                readModel: {
                    ...summary.readModel,
                    firestoreReads: summary.readModel.firestoreReads + (usedLegacySubscriptionFallback ? 5 : 0),
                    legacySubscriptionFallbackUsed: usedLegacySubscriptionFallback,
                    legacySubscriptionFallbackReadCap: usedLegacySubscriptionFallback ? 5 : 0,
                },
            },
        });
    } catch (error) {
        secureError('[Canonica Activation] Failed to load summary', error as Error, { tId, sId });
        return NextResponse.json({ error: 'Failed to load activation summary' }, { status: 500 });
    }
});
