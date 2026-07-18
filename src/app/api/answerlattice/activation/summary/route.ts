export const dynamic = 'force-dynamic';

/**
 * Answerlattice Activation Summary
 *
 * Cost-optimized management read model. This route reads the store document and
 * compact platformSummary docs; it does not scan KB, tickets, changelog, or
 * product surface collections.
 */

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import {
    buildAnswerlatticeActivationSummary,
    getAnswerlatticeActivationSummaryDocId,
    shouldPersistActivationSummary,
} from '@lib/answerlattice/activationSummary';
import { buildAnswerlatticeActivationAnswerTestSummary } from '@lib/answerlattice/activationAnswerTestSummary';
import {
    getAnswerlatticeAnswerTestSummaryId,
    normalizeAnswerlatticeAnswerTestSourceVersions,
} from '@lib/answerlattice/answerTestContracts';
import {
    areAnswerlatticeCompiledSourceVersionsValid,
    getAnswerlatticeBundleManifestDocId,
    getAnswerlatticeSourceVersionsDocId,
    normalizeCompiledSourceVersions,
} from '@lib/answerlattice/compiledContext';
import {
    getContextContentSummaryDocId,
    normalizeAnswerlatticeSurfaceContentSummary,
} from '@lib/answerlattice/productSurfaceContent';
import { normalizeAnswerlatticeScopeDocumentId, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../../readRateLimit';

const buildCompiledContextReadiness = (manifest: Record<string, any> | null) => {
    if (!manifest) {
        return {
            status: 'empty' as const,
            bundleVersion: 0,
            activeVersion: 0,
            lastReadyVersion: 0,
            publicBundleId: null,
            lastBuildError: null,
            staleReason: null,
            publicBundlesReady: false,
            privateBundlesReady: false,
        };
    }

    const bundles = manifest.bundles && typeof manifest.bundles === 'object' ? manifest.bundles : {};
    return {
        status: manifest.status || 'empty',
        bundleVersion: Number(manifest.bundleVersion || 0),
        activeVersion: Number(manifest.activeVersion || 0),
        lastReadyVersion: Number(manifest.lastReadyVersion || 0),
        publicBundleId: manifest.publicBundleId || null,
        generatedAt: manifest.generatedAt || null,
        lastBuildCompletedAt: manifest.lastBuildCompletedAt || null,
        lastBuildError: manifest.lastBuildError ? 'Compiled context rebuild failed. Check platform logs.' : null,
        staleReason: manifest.staleReason || null,
        stats: manifest.stats || {},
        limits: manifest.limits || {},
        publicBundlesReady: Object.keys(bundles).some(key => key.startsWith('public:')),
        privateBundlesReady: Object.keys(bundles).some(key => key.startsWith('private:')),
    };
};

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
};

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
    if (!answerlatticeScope) return null;
    return { tenantId: answerlatticeScope.tenantId, storeId: answerlatticeScope.storeId };
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
            const tenantMatches = normalizeAnswerlatticeScopeDocumentId(data.tenantId ?? data.tId) === tId;
            const productMatches = !data.productId || data.productId === 'AL' || data.pId === 'AL' || data.onboardingSource === 'ANSWERLATTICE_ONBOARDING';
            return tenantMatches && productMatches;
        });

    return match || null;
};

export const GET = withAuth(async (_request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ACTIVATION_COMMAND_CENTER) {
        return NextResponse.json({ error: 'Activation summary is not enabled.' }, { status: 403 });
    }

    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(_request, session, 'activation-summary');
    if (rateLimitResponse) return rateLimitResponse;

    const permission = await requireAnswerlatticePermission(_request, session, ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS);
    if (permission.response) return permission.response;

    const scope = resolveSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }

    const db = getAnswerlatticeDb();
    if (!db) {
        return NextResponse.json({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });
    }

    const { tenantId: tId, storeId: sId } = scope;

    try {
        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(sId));
        const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeActivationSummaryDocId(tId, sId));
        const contextRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getContextContentSummaryDocId(tId, sId));
        const coverageRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`coverage_${tId}_${sId}`);
        const trustRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`trustMetrics_${tId}_${sId}`);
        const bundleManifestRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeBundleManifestDocId(tId, sId));
        const answerTestsRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeAnswerTestSummaryId(tId, sId));
        const sourceVersionsRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeSourceVersionsDocId(tId, sId));

        const [
            storeSnap,
            existingSummarySnap,
            contextSnap,
            coverageSnap,
            trustSnap,
            bundleManifestSnap,
            answerTestsSnap,
            sourceVersionsSnap,
        ] = await Promise.all([
            storeRef.get(),
            summaryRef.get(),
            contextRef.get(),
            coverageRef.get(),
            trustRef.get(),
            bundleManifestRef.get(),
            answerTestsRef.get(),
            sourceVersionsRef.get(),
        ]);

        if (!storeSnap.exists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        const storeData = storeSnap.data() || {};
        const storeTenantId = normalizeAnswerlatticeScopeDocumentId(storeData.tenantId ?? storeData.tId);
        if (storeTenantId !== tId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const usedLegacySubscriptionFallback = !storeData.answerlatticeSubscription;
        const legacySubscription = usedLegacySubscriptionFallback
            ? await readLegacySubscription(db, tId, sId)
            : null;

        const compiledContext = buildCompiledContextReadiness(
            bundleManifestSnap.exists ? bundleManifestSnap.data() as any : null,
        );
        const rawSourceVersions = sourceVersionsSnap.exists ? sourceVersionsSnap.data() : null;
        const currentAnswerTestSourceVersions = !rawSourceVersions
            ? normalizeAnswerlatticeAnswerTestSourceVersions(normalizeCompiledSourceVersions({}))
            : rawSourceVersions.pId === PRODUCT_IDS.ANSWERLATTICE
                && rawSourceVersions.tId === tId
                && rawSourceVersions.sId === sId
                && areAnswerlatticeCompiledSourceVersionsValid(rawSourceVersions)
                ? normalizeAnswerlatticeAnswerTestSourceVersions(normalizeCompiledSourceVersions(rawSourceVersions))
                : null;
        const summary = buildAnswerlatticeActivationSummary({
            tId,
            sId,
            storeData,
            subscription: legacySubscription,
            contextSummary: contextSnap.exists
                ? normalizeAnswerlatticeSurfaceContentSummary({ ...contextSnap.data(), id: contextSnap.id }, { tId, sId }, contextSnap.id)
                : null,
            coverage: coverageSnap.exists ? coverageSnap.data() as any : null,
            trustMetrics: trustSnap.exists ? trustSnap.data() as any : null,
            compiledContext,
            answerTests: buildAnswerlatticeActivationAnswerTestSummary(
                answerTestsSnap.exists ? answerTestsSnap.data() : null,
                tId,
                sId,
                currentAnswerTestSourceVersions,
            ),
        });

        const existingSummary = existingSummarySnap.exists ? existingSummarySnap.data() || null : null;
        if (shouldPersistActivationSummary(existingSummary, summary)) {
            await summaryRef.set({
                ...summary,
                lastComputedAt: admin.firestore.FieldValue.serverTimestamp(),
                source: 'activation_summary_api',
            }, { merge: true });
        }

        return NextResponse.json(
            {
                summary: {
                    ...summary,
                    readModel: {
                        ...summary.readModel,
                        firestoreReads: summary.readModel.firestoreReads + (usedLegacySubscriptionFallback ? 5 : 0),
                        legacySubscriptionFallbackUsed: usedLegacySubscriptionFallback,
                        legacySubscriptionFallbackReadCap: usedLegacySubscriptionFallback ? 5 : 0,
                    },
                },
            },
            {
                headers: {
                    'Cache-Control': 'private, no-store',
                },
            },
        );
    } catch (error) {
        logRuntimeFailure('answerlattice_activation_summary_route_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tId),
            ...getBoundedRuntimeStringContext('storeId', sId),
        });
        return NextResponse.json({ error: 'Failed to load activation summary' }, { status: 500 });
    }
});
