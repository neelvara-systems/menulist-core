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
    parseAnswerlatticeCoverageData,
    parseAnswerlatticeTrustMetrics,
} from '@lib/answerlattice/analyticsIntelligenceContracts';
import {
    buildAnswerlatticeActivationSummary,
    buildAnswerlatticeActivationFirstValueEvidence,
    getAnswerlatticeActivationSummaryDocId,
    shouldPersistActivationFirstValueEvidenceAtomically,
    shouldPersistActivationSummary,
} from '@lib/answerlattice/activationSummary';
import { buildAnswerlatticeActivationAnswerTestSummary } from '@lib/answerlattice/activationAnswerTestSummary';
import {
    getAnswerlatticeAnswerTestSummaryId,
    normalizeAnswerlatticeAnswerTestSourceVersions,
} from '@lib/answerlattice/answerTestContracts';
import {
    areAnswerlatticeCompiledSourceVersionsValid,
    getAnswerlatticeBundleRefPath,
    getAnswerlatticeBundleManifestDocId,
    getAnswerlatticeSourceVersionsDocId,
    isAnswerlatticeContextBundleManifestForScope,
    normalizeCompiledSourceVersions,
} from '@lib/answerlattice/compiledContext';
import {
    getAnswerlatticeSubscriptionTimestampMillis,
    isAnswerlatticeSubscriptionCurrent,
    projectActiveAnswerlatticeSubscriptionForRead,
    projectAnswerlatticeSubscriptionForRead,
} from '@lib/answerlattice/subscriptionReadBoundary';
import {
    getContextContentSummaryDocId,
    normalizeAnswerlatticeSurfaceContentSummary,
} from '@lib/answerlattice/productSurfaceContent';
import { isAnswerlatticeStoreInScope, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { admin } from '@lib/firebase/firebaseAdminCompat';
import type { AnswerlatticeCompiledContextReadiness } from '@type/answerlattice';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../../readRateLimit';

const ANSWERLATTICE_ACTIVATION_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
} as const;

const withActivationResponseHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(ANSWERLATTICE_ACTIVATION_RESPONSE_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
};

const activationJson = (
    body: Record<string, unknown>,
    status = 200,
): NextResponse => NextResponse.json(body, {
    status,
    headers: ANSWERLATTICE_ACTIVATION_RESPONSE_HEADERS,
});

const normalizeNonNegativeSafeInteger = (value: unknown): number => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
        ? value
        : 0
);

const normalizeTimestampIso = (value: unknown): string | null => {
    if (!value) return null;
    try {
        if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
        if (value instanceof Timestamp) {
            const date = value.toDate();
            return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
        }
        const seconds = typeof value === 'object' && value !== null
            ? typeof Reflect.get(value, 'seconds') === 'number'
                ? Reflect.get(value, 'seconds')
                : typeof Reflect.get(value, '_seconds') === 'number'
                    ? Reflect.get(value, '_seconds')
                    : null
            : null;
        if (typeof seconds === 'number') {
            const date = new Date(seconds * 1000);
            return Number.isFinite(date.getTime()) ? date.toISOString() : null;
        }
        if (typeof value !== 'string') return null;
        const date = new Date(value);
        return Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
        return null;
    }
};

const buildCompiledContextReadiness = (
    manifest: unknown,
    tId: number,
    sId: number,
): AnswerlatticeCompiledContextReadiness => {
    if (!isAnswerlatticeContextBundleManifestForScope(manifest, tId, sId)) {
        return {
            status: 'empty',
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

    const bundleKeys = Object.keys(manifest.bundles);
    const isValidBundle = (key: string) => Boolean(getAnswerlatticeBundleRefPath(manifest, key, tId, sId));
    return {
        status: manifest.status,
        bundleVersion: manifest.bundleVersion,
        activeVersion: manifest.activeVersion,
        lastReadyVersion: manifest.lastReadyVersion,
        publicBundleId: manifest.publicBundleId,
        generatedAt: normalizeTimestampIso(manifest.generatedAt),
        lastBuildCompletedAt: normalizeTimestampIso(manifest.lastBuildCompletedAt),
        lastBuildError: manifest.lastBuildError ? 'Compiled context rebuild failed. Check platform logs.' : null,
        staleReason: manifest.staleReason ? 'Compiled context sources changed.' : null,
        stats: {
            bytesTotal: normalizeNonNegativeSafeInteger(manifest.stats?.bytesTotal),
            routes: normalizeNonNegativeSafeInteger(manifest.stats?.routes),
        },
        publicBundlesReady: bundleKeys.some(key => key.startsWith('public:') && isValidBundle(key)),
        privateBundlesReady: bundleKeys.some(key => key.startsWith('private:') && isValidBundle(key)),
    };
};

const getAnswerlatticeDb = (): Firestore | null => {
    const candidate: unknown = answerlatticeFirestoreAdmin;
    if (
        !candidate
        || typeof candidate !== 'object'
        || typeof Reflect.get(candidate, 'collection') !== 'function'
    ) {
        return null;
    }
    return answerlatticeFirestoreAdmin;
};

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
    if (!answerlatticeScope) return null;
    return { tenantId: answerlatticeScope.tenantId, storeId: answerlatticeScope.storeId };
};

const readLegacySubscription = async (
    db: Firestore,
    tId: number,
    sId: number,
): Promise<FirestoreSubscriptionDoc | null> => {
    const snapshot = await db
        .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('productId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tenantId', '==', tId)
        .where('storeId', '==', sId)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .limit(5)
        .get();

    const match = snapshot.docs
        .map((docSnap) => projectAnswerlatticeSubscriptionForRead(
            docSnap.data(),
            docSnap.id,
            tId,
            sId,
        ))
        .filter((subscription): subscription is FirestoreSubscriptionDoc => subscription !== null)
        .sort((left, right) => {
            const leftActive = left.status === 'active' && isAnswerlatticeSubscriptionCurrent(left);
            const rightActive = right.status === 'active' && isAnswerlatticeSubscriptionCurrent(right);
            if (leftActive !== rightActive) return rightActive ? 1 : -1;
            const leftEnd = getAnswerlatticeSubscriptionTimestampMillis(left.cycleEndDate) ?? 0;
            const rightEnd = getAnswerlatticeSubscriptionTimestampMillis(right.cycleEndDate) ?? 0;
            return rightEnd - leftEnd || String(left.id).localeCompare(String(right.id));
        })[0];

    return match || null;
};

export const GET = withAuth(async (_request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ACTIVATION_COMMAND_CENTER) {
        return activationJson({ error: 'Activation summary is not enabled.' }, 403);
    }

    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(_request, session, 'activation-summary');
    if (rateLimitResponse) return withActivationResponseHeaders(rateLimitResponse);

    const permission = await requireAnswerlatticePermission(_request, session, ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS);
    if (permission.response) return withActivationResponseHeaders(permission.response);

    const scope = resolveSessionScope(session);
    if (!scope) {
        return activationJson({ error: 'Not onboarded' }, 400);
    }

    const db = getAnswerlatticeDb();
    if (!db) {
        return activationJson({ error: 'Answerlattice Firebase is not configured' }, 503);
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

        const storeSnap = await storeRef.get();
        if (!storeSnap.exists) {
            return activationJson({ error: 'Store not found' }, 404);
        }

        const storeData = storeSnap.data() || {};
        if (!isAnswerlatticeStoreInScope(storeData, scope, storeSnap.id)) {
            return activationJson({ error: 'Forbidden' }, 403);
        }

        const [
            existingSummarySnap,
            contextSnap,
            coverageSnap,
            trustSnap,
            bundleManifestSnap,
            answerTestsSnap,
            sourceVersionsSnap,
        ] = await Promise.all([
            summaryRef.get(),
            contextRef.get(),
            coverageRef.get(),
            trustRef.get(),
            bundleManifestRef.get(),
            answerTestsRef.get(),
            sourceVersionsRef.get(),
        ]);

        const embeddedActiveSubscription = projectActiveAnswerlatticeSubscriptionForRead(
            storeData.answerlatticeSubscription,
            `activation_${tId}_${sId}`,
            tId,
            sId,
        );
        const usedLegacySubscriptionFallback = embeddedActiveSubscription === null;
        const legacySubscription = usedLegacySubscriptionFallback
            ? await readLegacySubscription(db, tId, sId)
            : null;

        const compiledContext = buildCompiledContextReadiness(
            bundleManifestSnap.exists ? bundleManifestSnap.data() : null,
            tId,
            sId,
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
        const existingSummary = existingSummarySnap.exists ? existingSummarySnap.data() || null : null;
        const summary = buildAnswerlatticeActivationSummary({
            tId,
            sId,
            storeData,
            subscription: legacySubscription,
            contextSummary: contextSnap.exists
                ? normalizeAnswerlatticeSurfaceContentSummary({ ...contextSnap.data(), id: contextSnap.id }, { tId, sId }, contextSnap.id)
                : null,
            coverage: coverageSnap.exists
                ? parseAnswerlatticeCoverageData(coverageSnap.data(), { tenantId: tId, storeId: sId })
                : null,
            trustMetrics: trustSnap.exists
                ? parseAnswerlatticeTrustMetrics(trustSnap.data(), { tenantId: tId, storeId: sId })
                : null,
            compiledContext,
            answerTests: buildAnswerlatticeActivationAnswerTestSummary(
                answerTestsSnap.exists ? answerTestsSnap.data() : null,
                tId,
                sId,
                currentAnswerTestSourceVersions,
            ),
            existingSummary,
        });

        let responseSummary = summary;
        if (shouldPersistActivationFirstValueEvidenceAtomically(existingSummary, summary)) {
            let transactionReadCount = 0;
            responseSummary = await db.runTransaction(async transaction => {
                transactionReadCount += 1;
                const latestSummarySnap = await transaction.get(summaryRef);
                const latestSummary = latestSummarySnap.exists ? latestSummarySnap.data() || null : null;
                const latestSummaryInScope = latestSummary?.pId === PRODUCT_IDS.ANSWERLATTICE
                    && latestSummary?.tId === tId
                    && latestSummary?.sId === sId
                    ? latestSummary
                    : null;
                const transactionComputedAtMillis = Math.max(
                    Date.now(),
                    Date.parse(summary.computedAtIso),
                );
                const transactionSummary = {
                    ...summary,
                    computedAtIso: new Date(transactionComputedAtMillis).toISOString(),
                    firstValueEvidence: buildAnswerlatticeActivationFirstValueEvidence({
                        existingEvidence: latestSummaryInScope?.firstValueEvidence,
                        launchProof: summary.launchProof,
                        nowMillis: transactionComputedAtMillis,
                    }),
                    readModel: {
                        ...summary.readModel,
                        firestoreReads: summary.readModel.firestoreReads + transactionReadCount,
                    },
                };

                if (
                    shouldPersistActivationFirstValueEvidenceAtomically(latestSummary, transactionSummary)
                    || shouldPersistActivationSummary(latestSummary, transactionSummary)
                ) {
                    const persistPayload = {
                        ...transactionSummary,
                        lastComputedAt: admin.firestore.FieldValue.serverTimestamp(),
                        source: 'activation_summary_api',
                    };
                    if (latestSummarySnap.exists) {
                        transaction.update(summaryRef, persistPayload);
                    } else {
                        transaction.create(summaryRef, persistPayload);
                    }
                }

                return transactionSummary;
            });
        } else if (shouldPersistActivationSummary(existingSummary, summary)) {
            const { firstValueEvidence: _preservedFirstValueEvidence, ...summaryWithoutFirstValueEvidence } = summary;
            await summaryRef.set({
                ...summaryWithoutFirstValueEvidence,
                lastComputedAt: admin.firestore.FieldValue.serverTimestamp(),
                source: 'activation_summary_api',
            }, { merge: true });
        }

        return activationJson({
            summary: {
                ...responseSummary,
                readModel: {
                    ...responseSummary.readModel,
                    firestoreReads: responseSummary.readModel.firestoreReads + (usedLegacySubscriptionFallback ? 5 : 0),
                    legacySubscriptionFallbackUsed: usedLegacySubscriptionFallback,
                    legacySubscriptionFallbackReadCap: usedLegacySubscriptionFallback ? 5 : 0,
                },
            },
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_activation_summary_route_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tId),
            ...getBoundedRuntimeStringContext('storeId', sId),
        });
        return activationJson({ error: 'Failed to load activation summary' }, 500);
    }
});
