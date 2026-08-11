import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { Timestamp } from 'firebase-admin/firestore';
import {
    AnswerlatticeStoredMutationProposalSchema,
} from './governanceContracts';
import {
    normalizeAnswerlatticeResolvedEntityIds,
} from './governanceIdBoundary';
import {
    ANSWERLATTICE_POST_CHANGE_CANDIDATE_LIMIT,
    ANSWERLATTICE_POST_CHANGE_CORRECTION_CANDIDATE_LIMIT,
    ANSWERLATTICE_POST_CHANGE_LIMITATIONS,
    ANSWERLATTICE_POST_CHANGE_RELEASE_CANDIDATE_LIMIT,
    ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT,
    AnswerlatticePostChangeCandidateListResponseSchema,
    AnswerlatticePostChangeCandidateSchema,
    AnswerlatticePostChangeReviewResponseSchema,
    buildAnswerlatticePostChangeBreakdown,
    buildAnswerlatticePostChangeComparison,
    buildAnswerlatticePostChangeWindowPlan,
    type AnswerlatticePostChangeBreakdown,
    type AnswerlatticePostChangeCandidate,
    type AnswerlatticePostChangeCandidateListResponse,
    type AnswerlatticePostChangeReviewResponse,
    type AnswerlatticePostChangeType,
    type AnswerlatticePostChangeWindow,
} from './postChangeEvidence';
import {
    AnswerlatticeStoredReleaseSchema,
    getAnswerlatticeTimestampMillis,
} from './releaseContracts';

const RELEASES = DB_COLLECTIONS.ANSWERLATTICE_RELEASES;
const PROPOSALS = DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS;
const SIGNALS = DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS;

type AnswerlatticePostChangeScope = {
    tId: number;
    sId: number;
};

type ValidatedPostChange = {
    candidate: AnswerlatticePostChangeCandidate;
    changedAtMillis: number;
    entityIds: string[];
};

type SignalWindowResult = {
    saturated: boolean;
    breakdown: AnswerlatticePostChangeBreakdown | null;
};

const KNOWLEDGE_CORRECTION_LABELS = {
    content_refinement: 'Answer content correction',
    scope_adjustment: 'Answer scope correction',
    version_update: 'Answer version correction',
    new_answer_required: 'New approved answer',
} as const;

export class AnswerlatticePostChangeEvidenceError extends Error {
    constructor(
        public readonly status: number,
        public readonly publicMessage: string,
        public readonly code = 'post_change_evidence_failed',
        message = publicMessage,
    ) {
        super(message);
        this.name = 'AnswerlatticePostChangeEvidenceError';
        Object.setPrototypeOf(this, AnswerlatticePostChangeEvidenceError.prototype);
    }
}

const getDb = () => {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new AnswerlatticePostChangeEvidenceError(
            503,
            'Support evidence review is temporarily unavailable.',
        );
    }
    return answerlatticeFirestoreAdmin;
};

const assertScope = (scope: AnswerlatticePostChangeScope): void => {
    if (!Number.isSafeInteger(scope.tId)
        || scope.tId <= 0
        || !Number.isSafeInteger(scope.sId)
        || scope.sId <= 0) {
        throw new AnswerlatticePostChangeEvidenceError(403, 'Forbidden.');
    }
};

const normalizeExactEntityIds = (value: unknown): string[] | null => {
    if (!Array.isArray(value) || value.length < 1 || value.length > 25) return null;
    const normalized = normalizeAnswerlatticeResolvedEntityIds(value, 25);
    if (normalized.length !== value.length) return null;
    return normalized;
};

const normalizeChangeId = (value: unknown): string | null => {
    if (typeof value !== 'string' || value.trim() !== value || value.length > 180) return null;
    return isValidFirestoreDocumentId(value) ? value : null;
};

const buildReleaseChange = (
    documentId: string,
    raw: unknown,
    scope: AnswerlatticePostChangeScope,
): ValidatedPostChange => {
    const parsed = AnswerlatticeStoredReleaseSchema.safeParse(raw);
    const changeId = normalizeChangeId(documentId);
    if (!changeId
        || !parsed.success
        || parsed.data.tId !== scope.tId
        || parsed.data.sId !== scope.sId
        || parsed.data.status !== 'active') {
        throw new AnswerlatticePostChangeEvidenceError(
            409,
            'A recent release has invalid workspace evidence.',
        );
    }
    const changedAtMillis = getAnswerlatticeTimestampMillis(parsed.data.activatedAt);
    const entityIds = normalizeExactEntityIds(parsed.data.entityChanges);
    if (changedAtMillis <= 0 || !entityIds) {
        throw new AnswerlatticePostChangeEvidenceError(
            409,
            'A recent release has incomplete activation evidence.',
        );
    }
    const candidate = AnswerlatticePostChangeCandidateSchema.parse({
        changeId,
        changeType: 'release',
        label: `Release v${parsed.data.versionLabel}`,
        changedAt: new Date(changedAtMillis).toISOString(),
        entityCount: entityIds.length,
    });
    return { candidate, changedAtMillis, entityIds };
};

const buildKnowledgeCorrectionFromProjection = (
    documentId: string,
    raw: FirebaseFirestore.DocumentData,
    scope: AnswerlatticePostChangeScope,
): ValidatedPostChange => {
    const changeId = normalizeChangeId(documentId);
    const changedAtMillis = getAnswerlatticeTimestampMillis(raw.implementedOn);
    const entityIds = normalizeExactEntityIds(raw.relatedEntityIds);
    const mutationType = raw.mutationType;
    if (!changeId
        || raw.pId !== PRODUCT_IDS.ANSWERLATTICE
        || raw.tId !== scope.tId
        || raw.sId !== scope.sId
        || raw.status !== 'implemented'
        || typeof raw.impactTracked !== 'boolean'
        || changedAtMillis <= 0
        || !entityIds
        || typeof mutationType !== 'string'
        || !(mutationType in KNOWLEDGE_CORRECTION_LABELS)) {
        throw new AnswerlatticePostChangeEvidenceError(
            409,
            'A recent knowledge correction has invalid workspace evidence.',
        );
    }
    const candidate = AnswerlatticePostChangeCandidateSchema.parse({
        changeId,
        changeType: 'knowledge_correction',
        label: KNOWLEDGE_CORRECTION_LABELS[mutationType as keyof typeof KNOWLEDGE_CORRECTION_LABELS],
        changedAt: new Date(changedAtMillis).toISOString(),
        entityCount: entityIds.length,
    });
    return { candidate, changedAtMillis, entityIds };
};

const buildKnowledgeCorrection = (
    documentId: string,
    raw: FirebaseFirestore.DocumentData,
    scope: AnswerlatticePostChangeScope,
): ValidatedPostChange => {
    const parsed = AnswerlatticeStoredMutationProposalSchema.safeParse({
        ...raw,
        id: documentId,
    });
    if (!parsed.success) {
        throw new AnswerlatticePostChangeEvidenceError(
            409,
            'The selected knowledge correction has invalid stored evidence.',
        );
    }
    return buildKnowledgeCorrectionFromProjection(documentId, parsed.data, scope);
};

const sortRecentChanges = (changes: ValidatedPostChange[]): ValidatedPostChange[] => (
    [...changes].sort((left, right) => (
        right.changedAtMillis - left.changedAtMillis
        || left.candidate.changeType.localeCompare(right.candidate.changeType)
        || left.candidate.changeId.localeCompare(right.candidate.changeId)
    ))
);

export async function loadAnswerlatticePostChangeCandidates(
    scope: AnswerlatticePostChangeScope,
    nowMillis = Date.now(),
): Promise<AnswerlatticePostChangeCandidateListResponse> {
    assertScope(scope);
    const db = getDb();
    const releaseQuery = db.collection(RELEASES)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
        .where('status', '==', 'active')
        .orderBy('versionNormalized', 'desc')
        .limit(ANSWERLATTICE_POST_CHANGE_RELEASE_CANDIDATE_LIMIT);
    const correctionQuery = db.collection(PROPOSALS)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
        .where('status', '==', 'implemented')
        .where('impactTracked', 'in', [false, true])
        .orderBy('implementedOn', 'asc')
        .limitToLast(ANSWERLATTICE_POST_CHANGE_CORRECTION_CANDIDATE_LIMIT)
        .select(
            'pId',
            'tId',
            'sId',
            'status',
            'impactTracked',
            'implementedOn',
            'relatedEntityIds',
            'mutationType',
        );

    const [releaseSnapshot, correctionSnapshot] = await Promise.all([
        releaseQuery.get(),
        correctionQuery.get(),
    ]);
    const releases = releaseSnapshot.docs.map(document => (
        buildReleaseChange(document.id, document.data(), scope)
    ));
    const corrections = correctionSnapshot.docs.map(document => (
        buildKnowledgeCorrectionFromProjection(document.id, document.data(), scope)
    ));
    const candidates = sortRecentChanges([...releases, ...corrections])
        .slice(0, ANSWERLATTICE_POST_CHANGE_CANDIDATE_LIMIT)
        .map(change => change.candidate);

    return AnswerlatticePostChangeCandidateListResponseSchema.parse({
        schemaVersion: 1,
        mode: 'list',
        generatedAt: new Date(nowMillis).toISOString(),
        candidates,
    });
}

const loadExactChange = async (
    scope: AnswerlatticePostChangeScope,
    changeType: AnswerlatticePostChangeType,
    changeId: string,
): Promise<ValidatedPostChange> => {
    const normalizedId = normalizeChangeId(changeId);
    if (!normalizedId) {
        throw new AnswerlatticePostChangeEvidenceError(400, 'Invalid support evidence review request.');
    }
    const collection = changeType === 'release' ? RELEASES : PROPOSALS;
    const snapshot = await getDb().collection(collection).doc(normalizedId).get();
    if (!snapshot.exists) {
        throw new AnswerlatticePostChangeEvidenceError(404, 'The selected change is no longer available.');
    }
    return changeType === 'release'
        ? buildReleaseChange(snapshot.id, snapshot.data(), scope)
        : buildKnowledgeCorrection(snapshot.id, snapshot.data() || {}, scope);
};

const querySignalWindow = async (
    scope: AnswerlatticePostChangeScope,
    entityIds: string[],
    window: AnswerlatticePostChangeWindow,
): Promise<SignalWindowResult> => {
    const startMillis = Date.parse(window.startAt);
    const endMillis = Date.parse(window.endAt);
    const entityIdSet = new Set(entityIds);
    const snapshot = await getDb().collection(SIGNALS)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
        .where('entityId', 'in', entityIds)
        .where('timestamp', '>=', Timestamp.fromMillis(startMillis))
        .where('timestamp', '<', Timestamp.fromMillis(endMillis))
        .orderBy('timestamp', 'asc')
        .limit(ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT + 1)
        .select('pId', 'tId', 'sId', 'entityId', 'type', 'timestamp')
        .get();
    if (snapshot.size > ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT) {
        return { saturated: true, breakdown: null };
    }

    const signalTypes: unknown[] = [];
    for (const document of snapshot.docs) {
        const signal = document.data();
        const timestampMillis = getAnswerlatticeTimestampMillis(signal.timestamp);
        if (signal.pId !== PRODUCT_IDS.ANSWERLATTICE
            || signal.tId !== scope.tId
            || signal.sId !== scope.sId
            || typeof signal.entityId !== 'string'
            || !entityIdSet.has(signal.entityId)
            || timestampMillis < startMillis
            || timestampMillis >= endMillis
            || typeof signal.type !== 'string'
            || signal.type.length > 80) {
            throw new AnswerlatticePostChangeEvidenceError(
                409,
                'Stored support evidence is invalid for this comparison.',
            );
        }
        signalTypes.push(signal.type);
    }
    return {
        saturated: false,
        breakdown: buildAnswerlatticePostChangeBreakdown(signalTypes),
    };
};

const buildReviewResponse = (
    change: ValidatedPostChange,
    plan: NonNullable<ReturnType<typeof buildAnswerlatticePostChangeWindowPlan>>,
    status: AnswerlatticePostChangeReviewResponse['status'],
    comparison: AnswerlatticePostChangeReviewResponse['comparison'],
    nowMillis: number,
): AnswerlatticePostChangeReviewResponse => AnswerlatticePostChangeReviewResponseSchema.parse({
    schemaVersion: 1,
    mode: 'review',
    generatedAt: new Date(nowMillis).toISOString(),
    change: change.candidate,
    status,
    mappingScope: 'direct_entity_links_only',
    excludedUtcDate: plan.excludedUtcDate,
    eligibleAt: plan.eligibleAt,
    beforeWindow: plan.beforeWindow,
    afterWindow: plan.afterWindow,
    sourceCapPerWindow: ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT,
    comparison,
    limitations: [...ANSWERLATTICE_POST_CHANGE_LIMITATIONS],
});

export async function loadAnswerlatticePostChangeReview(
    scope: AnswerlatticePostChangeScope,
    changeType: AnswerlatticePostChangeType,
    changeId: string,
    nowMillis = Date.now(),
): Promise<AnswerlatticePostChangeReviewResponse> {
    assertScope(scope);
    const change = await loadExactChange(scope, changeType, changeId);
    const plan = buildAnswerlatticePostChangeWindowPlan(change.changedAtMillis, nowMillis);
    if (!plan) {
        throw new AnswerlatticePostChangeEvidenceError(
            409,
            'The selected change has an invalid completion time.',
        );
    }
    if (plan.status === 'waiting_for_post_window' || plan.status === 'outside_retention') {
        return buildReviewResponse(change, plan, plan.status, null, nowMillis);
    }

    const beforeResult = await querySignalWindow(scope, change.entityIds, plan.beforeWindow);
    if (beforeResult.saturated || !beforeResult.breakdown) {
        return buildReviewResponse(change, plan, 'source_window_saturated', null, nowMillis);
    }
    const afterResult = await querySignalWindow(scope, change.entityIds, plan.afterWindow);
    if (afterResult.saturated || !afterResult.breakdown) {
        return buildReviewResponse(change, plan, 'source_window_saturated', null, nowMillis);
    }
    const result = buildAnswerlatticePostChangeComparison(
        beforeResult.breakdown,
        afterResult.breakdown,
    );
    return buildReviewResponse(change, plan, result.status, result.comparison, nowMillis);
}
