import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import type { AnswerlatticeAccessContext } from '@lib/answerlattice/accessControl';
import {
    getAnswerlatticeBundleManifestDocId,
    getAnswerlatticeSourceVersionsDocId,
} from '@lib/answerlattice/compiledContext';
import { normalizeAnswerlatticeKnowledgeIntakeSourceId } from '@lib/answerlattice/knowledgeIntakeIdBoundary';
import { getContextContentSummaryDocId } from '@lib/answerlattice/productSurfaceContent';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import {
    ANSWERLATTICE_MAX_RELEASE_EVIDENCE_SOURCE_IDS,
    ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT,
    ANSWERLATTICE_SUPPORT_TRUTH_CHANGE_CONTROL_VERSION,
    AnswerlatticeSupportTruthChangeControlSchema,
    buildAnswerlatticeCrossSurfaceReview,
    buildAnswerlatticeReleaseTruthReview,
    buildAnswerlatticeSourceFreshnessWatch,
    buildAnswerlatticeTruthPropagationProof,
    buildAnswerlatticeUnavailableSourceFreshnessWatch,
    type AnswerlatticeReleaseTruthReview,
    type AnswerlatticeSupportTruthChangeControl,
} from './supportTruthChangeControl';

type AffectedAnswerEvidence = {
    answerId: string;
    evidenceSourceIds: string[];
    invalidEvidenceReferenceCount: number;
};

type ReleaseChangeControlInput = {
    access: AnswerlatticeAccessContext;
    affectedAnswers: AffectedAnswerEvidence[];
    answerTestState: AnswerlatticeReleaseTruthReview['answerTestState'];
    changedEntityIds: string[];
    directActiveAnswerCount: number;
    entityIdsWithoutVisibleDirectLinks: string[];
    reviewRequiredCount: number;
};

const SOURCE_WATCH_FIELDS = [
    'pId',
    'tId',
    'sId',
    'title',
    'status',
    'governance.approvalStatus',
    'governance.effectiveDate',
    'governance.reviewDate',
    'governance.conflictSourceIds',
] as const;

const CONTROL_PROOF_FIELDS = [
    'pId',
    'tId',
    'sId',
    'generatedAt',
    'surfaceCount',
    'articleCount',
    'faqCount',
    'changelogCount',
    'ticketCount',
    'surfaces',
    'schemaVersion',
    'workspaceProfile',
    'widgetConfig',
    'kb',
    'docsNav',
    'entities',
    'entityRelations',
    'canonical',
    'releases',
    'branding',
    'mcpPolicy',
    'predictiveTriggers',
    'bundleVersion',
    'activeVersion',
    'lastReadyVersion',
    'status',
    'sourceVersions',
    'bundles',
    'publicBundleId',
] as const;

const getDb = () => {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new Error('answerlattice_change_control_firestore_unavailable');
    }
    return answerlatticeFirestoreAdmin;
};

const getPropagationFeatures = () => ({
    contextBundlesEnabled: Boolean(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES),
    helpCenterEnabled: Boolean(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_HOSTED_HELP_CENTER),
    mcpEnabled: Boolean(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_MCP),
    publicApiBundleReadsEnabled: Boolean(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PUBLIC_API_BUNDLE_READS),
    publicApiEnabled: Boolean(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PUBLIC_API),
    widgetBundleBootstrapEnabled: Boolean(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET_BUNDLE_BOOTSTRAP),
    widgetEnabled: Boolean(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET),
});

const buildEvidenceLinks = (answers: AffectedAnswerEvidence[]) => {
    const answerIdsBySource = new Map<string, Set<string>>();
    for (const answer of answers) {
        for (const sourceId of answer.evidenceSourceIds) {
            const answerIds = answerIdsBySource.get(sourceId) || new Set<string>();
            answerIds.add(answer.answerId);
            answerIdsBySource.set(sourceId, answerIds);
        }
    }
    return Array.from(answerIdsBySource.entries())
        .map(([sourceId, answerIds]) => ({ sourceId, linkedAnswerCount: answerIds.size }))
        .sort((left, right) => left.sourceId.localeCompare(right.sourceId));
};

const loadSourceFreshnessWatch = async (
    input: ReleaseChangeControlInput,
    checkedAt: string,
) => {
    const evidenceLinks = buildEvidenceLinks(input.affectedAnswers);
    const invalidEvidenceReferenceCount = Math.min(
        ANSWERLATTICE_MAX_RELEASE_EVIDENCE_SOURCE_IDS,
        input.affectedAnswers.reduce((total, answer) => total + answer.invalidEvidenceReferenceCount, 0),
    );
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SOURCE_GOVERNANCE) {
        return buildAnswerlatticeSourceFreshnessWatch({
            checkedAt,
            checkedSources: [],
            evidenceLinks,
            governanceEnabled: false,
            invalidEvidenceReferenceCount,
            scope: {
                tId: input.access.scope.tenantId,
                sId: input.access.scope.storeId,
            },
        });
    }

    const sourceIds = evidenceLinks
        .map(link => link.sourceId)
        .filter(sourceId => normalizeAnswerlatticeKnowledgeIntakeSourceId(sourceId) === sourceId)
        .slice(0, ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT);
    if (sourceIds.length === 0) {
        return buildAnswerlatticeSourceFreshnessWatch({
            checkedAt,
            checkedSources: [],
            evidenceLinks,
            governanceEnabled: true,
            invalidEvidenceReferenceCount,
            scope: {
                tId: input.access.scope.tenantId,
                sId: input.access.scope.storeId,
            },
        });
    }

    try {
        const db = getDb();
        const snapshots = await db.getAll(
            ...sourceIds.map(sourceId => (
                db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(sourceId)
            )),
            { fieldMask: [...SOURCE_WATCH_FIELDS] },
        );
        return buildAnswerlatticeSourceFreshnessWatch({
            checkedAt,
            checkedSources: snapshots.map(snapshot => ({
                sourceId: snapshot.id,
                exists: snapshot.exists,
                ...(snapshot.exists ? { data: snapshot.data() } : {}),
            })),
            evidenceLinks,
            governanceEnabled: true,
            invalidEvidenceReferenceCount,
            scope: {
                tId: input.access.scope.tenantId,
                sId: input.access.scope.storeId,
            },
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_support_truth_source_watch_read_failed', error, {
            hasTenantScope: true,
            hasStoreScope: true,
            sourceCount: sourceIds.length,
        });
        return buildAnswerlatticeUnavailableSourceFreshnessWatch({
            checkedAt,
            evidenceLinks,
            invalidEvidenceReferenceCount,
        });
    }
};

const loadControlProofs = async (
    input: ReleaseChangeControlInput,
    checkedAt: string,
) => {
    const scope = {
        tId: input.access.scope.tenantId,
        sId: input.access.scope.storeId,
    };
    try {
        const db = getDb();
        const [surfaceSnapshot, sourceVersionsSnapshot, manifestSnapshot] = await db.getAll(
            db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getContextContentSummaryDocId(scope.tId, scope.sId)),
            db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeSourceVersionsDocId(scope.tId, scope.sId)),
            db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeBundleManifestDocId(scope.tId, scope.sId)),
            { fieldMask: [...CONTROL_PROOF_FIELDS] },
        );
        return {
            surfaceReview: buildAnswerlatticeCrossSurfaceReview({
                changedEntityIds: input.changedEntityIds,
                documentExists: surfaceSnapshot.exists,
                documentValue: surfaceSnapshot.data(),
                scope,
            }),
            propagationProof: buildAnswerlatticeTruthPropagationProof({
                checkedAt,
                features: getPropagationFeatures(),
                manifestExists: manifestSnapshot.exists,
                manifestValue: manifestSnapshot.data(),
                scope,
                sourceVersionsExists: sourceVersionsSnapshot.exists,
                sourceVersionsValue: sourceVersionsSnapshot.data(),
            }),
        };
    } catch (error) {
        logRuntimeFailure('answerlattice_support_truth_control_proof_read_failed', error, {
            hasTenantScope: true,
            hasStoreScope: true,
        });
        return {
            surfaceReview: buildAnswerlatticeCrossSurfaceReview({
                changedEntityIds: input.changedEntityIds,
                documentExists: true,
                documentValue: null,
                scope,
            }),
            propagationProof: buildAnswerlatticeTruthPropagationProof({
                checkedAt,
                features: getPropagationFeatures(),
                manifestExists: true,
                manifestValue: null,
                scope,
                sourceVersionsExists: true,
                sourceVersionsValue: null,
            }),
        };
    }
};

export const loadAnswerlatticeSupportTruthChangeControl = async (
    input: ReleaseChangeControlInput,
): Promise<AnswerlatticeSupportTruthChangeControl> => {
    const generatedAt = new Date().toISOString();
    const releaseReview = buildAnswerlatticeReleaseTruthReview({
        changedEntityIds: input.changedEntityIds,
        directActiveAnswerCount: input.directActiveAnswerCount,
        reviewRequiredCount: input.reviewRequiredCount,
        answerTestState: input.answerTestState,
        entityIdsWithoutVisibleDirectLinks: input.entityIdsWithoutVisibleDirectLinks,
    });
    const [sourceWatch, controlProofs] = await Promise.all([
        loadSourceFreshnessWatch(input, generatedAt),
        loadControlProofs(input, generatedAt),
    ]);
    return AnswerlatticeSupportTruthChangeControlSchema.parse({
        contractVersion: ANSWERLATTICE_SUPPORT_TRUTH_CHANGE_CONTROL_VERSION,
        generatedAt,
        releaseReview,
        sourceWatch,
        surfaceReview: controlProofs.surfaceReview,
        propagationProof: controlProofs.propagationProof,
    });
};
