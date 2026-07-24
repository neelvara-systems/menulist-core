import { createHash } from 'crypto';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    deriveAutomatedDriftState,
    evaluateAnswerlatticeAutomatedDrift,
    type AnswerlatticeDriftAnswer,
    type AnswerlatticeDriftEntity,
    type AnswerlatticeDriftSignal,
} from '@data/shared/answerlatticeDrift';
import {
    ANSWERLATTICE_CACHE_SOURCES,
} from '@lib/answerlattice/cacheVersionManifest';
import {
    normalizeAnswerlatticeCanonicalAnswerId,
    normalizeAnswerlatticeMutationProposalId,
    normalizeAnswerlatticeResolvedEntityId,
    normalizeAnswerlatticeResolvedEntityIds,
    replaceAnswerlatticeResolvedEntityReference,
} from '@lib/answerlattice/governanceIdBoundary';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import { normalizeStepOrder, validateProcedure } from '@lib/answerlattice/procedureValidation';
import {
    parseAnswerlatticeRetrievalCanonicalAnswer,
    parseAnswerlatticeRetrievalEntity,
} from '@lib/answerlattice/retrievalContracts';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import type {
    AnswerlatticeCanonicalAnswer,
    AnswerlatticeCanonicalEvidence,
    AnswerlatticeEntity,
    AnswerlatticeEntityRelation,
    AnswerlatticeProcedure,
} from '@type/answerlattice';
import { FieldValue, Timestamp, type Transaction } from 'firebase-admin/firestore';

import type {
    AnswerlatticeCanonicalProposalAnswer,
    AnswerlatticeGovernanceEditedContent,
    AnswerlatticeGovernanceAction,
    AnswerlatticeGovernanceActionResult,
} from './governanceContracts';
import {
    AnswerlatticeCanonicalEvidenceSchema,
    AnswerlatticeCanonicalProposalAnswerSchema,
    AnswerlatticeStoredMutationProposalSchema,
} from './governanceContracts';
import { buildAnswerlatticeEntityPrefixTokens } from './entitySearchTokens';
import { ANSWERLATTICE_FAQ_MANAGEMENT_LIMIT } from './faqContent';
import {
    AnswerlatticeInvalidationOwnershipError,
    getAnswerlatticeInvalidationCacheSources,
    getAnswerlatticeMissingBundleManifestBase,
    getAnswerlatticeMissingSourceVersionsBase,
    readAnswerlatticeInvalidationOwnership,
    type AnswerlatticeInvalidationOwnership,
} from './invalidationOwnership';
import { ANSWERLATTICE_PRODUCT_SURFACE_LIMIT } from './productSurfaceContent';
import { buildAnswerlatticeProposalImpactAffectedEntityIds } from './proposalImpactContracts';
import { answerlatticeTokenize } from './tokenizer';

const CANONICAL_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS;
const PROPOSAL_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS;
const AUDIT_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS;
const ENTITY_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITIES;
const RELATION_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS;
const SEARCH_INDEX_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX;
const RELEASE_COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_RELEASES;
const MAX_GOVERNANCE_QUERY_DOCUMENTS = 500;
const MAX_DRIFT_ENTITY_DOCUMENTS = 1_000;
const MAX_DRIFT_SIGNAL_DOCUMENTS = 1_000;
const MAX_DRIFT_TRANSACTION_ANSWERS = 150;
const MAX_ENTITY_MERGE_WRITES = 450;
const MAX_ENTITY_MERGE_REFERENCES = 200;
const MAX_ENTITY_SEARCH_INDEX_RECORDS = 10;
const MAX_KB_ARTICLE_ENTITY_IDS = 10;
const MAX_SUPPORT_CONTENT_ENTITY_IDS = 25;
const DEFAULT_VERSION = 1_000_000;

type GovernanceScope = {
    tId: number;
    sId: number;
};

type GovernanceActor = {
    id: string;
    label: string;
};

export type AnswerlatticeGovernanceAccess = {
    scope: {
        tenantId: number;
        storeId: number;
    };
    user: {
        id?: unknown;
        email?: unknown;
        name?: unknown;
    };
};

export class AnswerlatticeGovernanceError extends Error {
    public readonly status: number;
    public readonly publicMessage: string;

    constructor(message: string, status = 409, publicMessage = 'The governance action could not be completed.') {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = 'AnswerlatticeGovernanceError';
        this.status = status;
        this.publicMessage = publicMessage;
    }
}

const getDb = () => {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new AnswerlatticeGovernanceError(
            'answerlattice_admin_unavailable',
            503,
            'Answerlattice governance is temporarily unavailable.',
        );
    }
    return answerlatticeFirestoreAdmin;
};

const getScopeAndActor = (access: AnswerlatticeGovernanceAccess): { scope: GovernanceScope; actor: GovernanceActor } => {
    const tId = Number(access.scope.tenantId);
    const sId = Number(access.scope.storeId);
    if (!Number.isFinite(tId) || tId <= 0 || !Number.isFinite(sId) || sId <= 0) {
        throw new AnswerlatticeGovernanceError('answerlattice_scope_invalid', 400, 'Answerlattice workspace scope is missing.');
    }

    const actorId = String(access.user.id || access.user.email || 'answerlattice_owner').trim().slice(0, 180);
    const actorLabel = String(access.user.email || access.user.name || actorId).trim().slice(0, 180);
    return {
        scope: { tId, sId },
        actor: {
            id: actorId || 'answerlattice_owner',
            label: actorLabel || 'answerlattice_owner',
        },
    };
};

const hashValue = (value: string, length = 32) => createHash('sha256').update(value).digest('hex').slice(0, length);

const timestampToMillis = (value: unknown): number => {
    if (!value || typeof value !== 'object') return 0;
    const candidate = value as { toMillis?: () => number; seconds?: unknown };
    if (typeof candidate.toMillis === 'function') {
        const millis = candidate.toMillis();
        return Number.isFinite(millis) && millis >= 0 ? millis : 0;
    }
    const seconds = Number(candidate.seconds);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1_000 : 0;
};

const toDriftAnswer = (answer: AnswerlatticeCanonicalAnswer): AnswerlatticeDriftAnswer => ({
    id: answer.id,
    entityIds: normalizeAnswerlatticeResolvedEntityIds(answer.scope.entityIds, 25),
    planIds: normalizeAnswerlatticeResolvedEntityIds(answer.scope.planIds, 50),
    roleIds: normalizeAnswerlatticeResolvedEntityIds(answer.scope.roleIds, 50),
    stateIds: normalizeAnswerlatticeResolvedEntityIds(answer.scope.stateIds, 50),
    versionFrom: answer.productBinding.applicableVersions.from,
    versionTo: answer.productBinding.applicableVersions.to,
    lastValidatedInVersion: answer.productBinding.lastValidatedInVersion,
    lastValidatedAtMs: timestampToMillis(answer.validation.lastValidatedOn),
});

const getEntityRelationId = (
    scope: GovernanceScope,
    fromEntityId: string,
    toEntityId: string,
    relationType: string,
) => `relation_${hashValue(`${scope.tId}:${scope.sId}:${fromEntityId}:${toEntityId}:${relationType}`, 32)}`;

const searchIndexIsOwnedBy = (
    value: unknown,
    scope: GovernanceScope,
    entityId: string,
) => Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && documentIsInScope(value as Record<string, unknown>, scope)
    && (value as Record<string, unknown>).entityId === entityId,
);

const relationIsOwnedBy = (
    value: unknown,
    scope: GovernanceScope,
    relation: Pick<AnswerlatticeEntityRelation, 'fromEntityId' | 'toEntityId' | 'relationType'>,
) => Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && documentIsInScope(value as Record<string, unknown>, scope)
    && (value as Record<string, unknown>).fromEntityId === relation.fromEntityId
    && (value as Record<string, unknown>).toEntityId === relation.toEntityId
    && (value as Record<string, unknown>).relationType === relation.relationType,
);

const buildEntitySearchIndex = (
    entity: Pick<AnswerlatticeEntity, 'id' | 'name' | 'description' | 'aliases'>,
    scope: GovernanceScope,
    id: string,
    weight: number,
) => {
    const normalizedTokens = Array.from(new Set([
        ...answerlatticeTokenize(entity.name),
        ...answerlatticeTokenize(entity.description, 4).slice(0, 10),
    ])).slice(0, 80);
    const synonyms = Array.from(new Set((entity.aliases || []).map(alias => alias.toLowerCase()))).slice(0, 20);
    return {
        id,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tId,
        sId: scope.sId,
        entityId: entity.id,
        canonicalName: entity.name,
        synonyms,
        normalizedTokens,
        prefixTokens: buildAnswerlatticeEntityPrefixTokens({
            canonicalName: entity.name,
            normalizedTokens,
            synonyms,
        }),
        weight,
    };
};

const stableSerialize = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(item => stableSerialize(item)).join(',')}]`;
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const entries = Object.keys(record)
            .filter(key => record[key] !== undefined)
            .sort()
            .map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`);
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value) ?? 'null';
};

const normalizeOptionalText = (value: unknown): string | undefined => {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || undefined;
};

const buildSlug = (title: string) => {
    const slug = title
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || `answer-${hashValue(title, 12)}`;
};

const documentIsInScope = (data: Record<string, any>, scope: GovernanceScope) => (
    data.pId === PRODUCT_IDS.ANSWERLATTICE
    && normalizeAnswerlatticeScopeDocumentId(data.tId) === scope.tId
    && normalizeAnswerlatticeScopeDocumentId(data.sId) === scope.sId
);

const buildAnswerSnapshot = (answer: Record<string, any>) => ({
    title: answer.title,
    slug: answer.slug,
    status: answer.status,
    answerType: answer.answerType,
    scope: answer.scope,
    productBinding: answer.productBinding,
    content: answer.content,
    evidence: answer.evidence,
    validation: answer.validation,
    governance: answer.governance,
});

const buildAnswerFingerprint = (answer: Record<string, any>) => (
    hashValue(stableSerialize(buildAnswerSnapshot(answer)), 64)
);

const normalizeCanonicalEvidence = (value: unknown): AnswerlatticeCanonicalEvidence => {
    const parsed = AnswerlatticeCanonicalEvidenceSchema.parse(value || { sourceIds: [], citations: [] });
    const sourceIds = Array.from(new Set(parsed.sourceIds.filter(isValidFirestoreDocumentId)));
    const seenUrls = new Set<string>();
    const citations = parsed.citations.flatMap((citation) => {
        let normalizedUrl: string;
        try {
            normalizedUrl = new URL(citation.url).toString();
        } catch {
            return [];
        }
        if (seenUrls.has(normalizedUrl)) return [];
        seenUrls.add(normalizedUrl);
        const sourceId = citation.sourceId && sourceIds.includes(citation.sourceId)
            ? citation.sourceId
            : undefined;
        return [{
            id: `citation_${hashValue(normalizedUrl, 24)}`,
            title: citation.title.trim(),
            url: normalizedUrl,
            ...(sourceId ? { sourceId } : {}),
        }];
    });
    return { sourceIds, citations };
};

const getTimestampMillis = (value: unknown): number | null => {
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;
    const seconds = Number(record.seconds ?? record._seconds);
    const nanoseconds = Number(record.nanoseconds ?? record._nanoseconds ?? 0);
    if (Number.isFinite(seconds) && Number.isFinite(nanoseconds)) {
        return (seconds * 1000) + (nanoseconds / 1_000_000);
    }
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis !== 'function') return null;
    const milliseconds = Number(toMillis.call(value));
    return Number.isFinite(milliseconds) ? milliseconds : null;
};

const assertProposalBaseAnswerIsCurrent = (
    proposal: Record<string, any>,
    currentAnswer: Record<string, any> | null,
) => {
    const expectedFingerprint = proposal.suggestedChange?.baseAnswerFingerprint;
    if (!currentAnswer) return;
    if (!expectedFingerprint) {
        if (proposal.targetAnswerId && proposal.suggestedChange?.draftSource === 'manual_authoring') {
            throw new AnswerlatticeGovernanceError(
                'canonical_proposal_base_missing',
                409,
                'This update proposal predates revision protection. Review the latest answer and submit a new proposal.',
            );
        }
        if (proposal.targetAnswerId) {
            const proposalCreatedOn = getTimestampMillis(proposal.createdOn);
            const answerModifiedOn = getTimestampMillis(currentAnswer.modifiedOn);
            if (proposalCreatedOn == null || answerModifiedOn == null) {
                throw new AnswerlatticeGovernanceError(
                    'canonical_proposal_base_unverifiable',
                    409,
                    'This proposal cannot verify the approved answer revision. Review the latest answer and submit a new proposal.',
                );
            }
            if (answerModifiedOn > proposalCreatedOn) {
                throw new AnswerlatticeGovernanceError(
                    'canonical_proposal_base_changed',
                    409,
                    'The approved answer changed after this proposal was created. Review the latest answer and submit a new proposal.',
                );
            }
        }
        return;
    }
    if (expectedFingerprint === buildAnswerFingerprint(currentAnswer)) return;

    throw new AnswerlatticeGovernanceError(
        'canonical_proposal_base_changed',
        409,
        'The approved answer changed after this proposal was created. Review the latest answer and submit a new proposal.',
    );
};

const listOverlaps = (left?: unknown[], right?: unknown[]) => (
    !left?.length || !right?.length || left.some(value => right.includes(value))
);

const answersConflict = (left: Record<string, any>, right: Record<string, any>) => {
    if (left.status !== 'active' || right.status !== 'active') return false;
    const leftEntities = normalizeAnswerlatticeResolvedEntityIds(left.scope?.entityIds, 25);
    const rightEntities = normalizeAnswerlatticeResolvedEntityIds(right.scope?.entityIds, 25);
    if (!leftEntities.some(entityId => rightEntities.includes(entityId))) return false;

    const leftFrom = Number(left.productBinding?.applicableVersions?.from);
    const leftTo = left.productBinding?.applicableVersions?.to == null
        ? Number.POSITIVE_INFINITY
        : Number(left.productBinding.applicableVersions.to);
    const rightFrom = Number(right.productBinding?.applicableVersions?.from);
    const rightTo = right.productBinding?.applicableVersions?.to == null
        ? Number.POSITIVE_INFINITY
        : Number(right.productBinding.applicableVersions.to);
    const versionOverlap = leftFrom <= rightTo && rightFrom <= leftTo;
    if (!versionOverlap) return false;

    return listOverlaps(left.scope?.planIds, right.scope?.planIds)
        && listOverlaps(left.scope?.roleIds, right.scope?.roleIds)
        && listOverlaps(left.scope?.stateIds, right.scope?.stateIds);
};

const assertCanonicalCandidate = (candidate: Record<string, any>) => {
    const parsedCandidate = AnswerlatticeCanonicalProposalAnswerSchema.safeParse({
        title: candidate.title,
        status: candidate.status,
        answerType: candidate.answerType,
        scope: candidate.scope,
        productBinding: candidate.productBinding,
        content: candidate.content,
        evidence: candidate.evidence,
    });
    if (!parsedCandidate.success) {
        throw new AnswerlatticeGovernanceError('canonical_candidate_invalid', 409, 'The proposed answer is incomplete or invalid.');
    }

    const entityIds = normalizeAnswerlatticeResolvedEntityIds(candidate.scope?.entityIds, 25);
    if (entityIds.length === 0 || entityIds.length !== candidate.scope?.entityIds?.length) {
        throw new AnswerlatticeGovernanceError('canonical_entity_scope_invalid', 409, 'Choose at least one valid product entity.');
    }

    const from = Number(candidate.productBinding?.applicableVersions?.from);
    const toValue = candidate.productBinding?.applicableVersions?.to;
    const to = toValue == null ? null : Number(toValue);
    if (!Number.isInteger(from) || from <= 0 || (to !== null && (!Number.isInteger(to) || to < from))) {
        throw new AnswerlatticeGovernanceError('canonical_version_window_invalid', 409, 'The answer version window is invalid.');
    }

    const introduced = Number(candidate.productBinding?.introducedInVersion);
    const validated = Number(candidate.productBinding?.lastValidatedInVersion);
    if (!Number.isInteger(introduced) || introduced <= 0 || !Number.isInteger(validated) || validated < introduced) {
        throw new AnswerlatticeGovernanceError('canonical_product_binding_invalid', 409, 'The answer version binding is invalid.');
    }

    if (
        candidate.status === 'active'
        && candidate.governance?.driftFlag === true
        && candidate.governance?.reviewRequired === true
    ) {
        throw new AnswerlatticeGovernanceError('canonical_drift_activation_blocked', 409, 'Validate the drifted answer before activating it.');
    }

    const procedure = candidate.content?.procedure as AnswerlatticeProcedure | undefined;
    if (procedure) normalizeStepOrder(procedure);
    const procedureValidation = validateProcedure(candidate.answerType, procedure);
    if (!procedureValidation.valid) {
        throw new AnswerlatticeGovernanceError('canonical_procedure_invalid', 409, 'The answer procedure is incomplete or invalid.');
    }
};

type InvalidationOptions = {
    reason: string;
    sourceId: string;
    canonical?: boolean;
    entities?: boolean;
    entityRelations?: boolean;
    faqs?: boolean;
    kb?: boolean;
    surfaces?: boolean;
};

const addInvalidationWrites = (
    transaction: Transaction,
    scope: GovernanceScope,
    ownership: AnswerlatticeInvalidationOwnership,
    options: InvalidationOptions,
) => {
    const db = getDb();
    const now = FieldValue.serverTimestamp();
    const sourceVersionChanges: Record<string, unknown> = {
        schemaVersion: 1,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tId,
        sId: scope.sId,
        updatedAt: now,
        lastReason: options.reason.slice(0, 80),
        lastSourceId: options.sourceId.slice(0, 160),
        lastSourceType: options.canonical ? CANONICAL_COLLECTION : ENTITY_COLLECTION,
    };
    if (options.canonical) sourceVersionChanges.canonical = FieldValue.increment(1);
    if (options.entities) sourceVersionChanges.entities = FieldValue.increment(1);
    if (options.entityRelations) sourceVersionChanges.entityRelations = FieldValue.increment(1);
    if (options.faqs) sourceVersionChanges.faqs = FieldValue.increment(1);
    if (options.kb) sourceVersionChanges.kb = FieldValue.increment(1);
    if (options.surfaces) sourceVersionChanges.surfaces = FieldValue.increment(1);

    if (options.canonical) {
        transaction.set(
            ownership.cacheVersionRefs[ANSWERLATTICE_CACHE_SOURCES.CANONICAL]!,
            {
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: scope.tId,
                sId: scope.sId,
                source: ANSWERLATTICE_CACHE_SOURCES.CANONICAL,
                version: FieldValue.increment(1),
                modifiedOn: now,
                lastReason: options.reason.slice(0, 80),
                lastSourceId: options.sourceId.slice(0, 160),
                lastSourceType: CANONICAL_COLLECTION,
            },
            { merge: true },
        );
    }
    if (options.kb || options.faqs) {
        transaction.set(
            ownership.cacheVersionRefs[ANSWERLATTICE_CACHE_SOURCES.KB]!,
            {
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: scope.tId,
                sId: scope.sId,
                source: ANSWERLATTICE_CACHE_SOURCES.KB,
                version: FieldValue.increment(1),
                modifiedOn: now,
                lastReason: options.reason.slice(0, 80),
                lastSourceId: options.sourceId.slice(0, 160),
                lastSourceType: DB_COLLECTIONS.KB_ARTICLES,
            },
            { merge: true },
        );
    }

    transaction.set(
        ownership.sourceVersionsRef,
        {
            ...(!ownership.sourceVersionsExists ? getAnswerlatticeMissingSourceVersionsBase(scope) : {}),
            ...sourceVersionChanges,
        },
        { merge: true },
    );
    transaction.set(
        ownership.manifestRef,
        {
            ...(!ownership.manifestExists ? getAnswerlatticeMissingBundleManifestBase(scope) : {}),
            schemaVersion: 1,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: scope.tId,
            sId: scope.sId,
            status: 'stale',
            staleReason: options.reason.slice(0, 80),
            updatedAt: now,
            lastReason: options.reason.slice(0, 80),
            lastSourceId: options.sourceId.slice(0, 160),
        },
        { merge: true },
    );
};

const readInvalidationOwnership = async (
    transaction: Transaction,
    scope: GovernanceScope,
    options: InvalidationOptions,
): Promise<AnswerlatticeInvalidationOwnership> => {
    try {
        return await readAnswerlatticeInvalidationOwnership({
            cacheSources: getAnswerlatticeInvalidationCacheSources(options),
            db: getDb(),
            scope,
            transaction,
        });
    } catch (error) {
        if (error instanceof AnswerlatticeInvalidationOwnershipError) {
            throw new AnswerlatticeGovernanceError(
                'answerlattice_invalidation_ownership_conflict',
                409,
                'Answer cache authority needs repair before this action can continue.',
            );
        }
        throw error;
    }
};

const getLatestActiveVersion = async (transaction: Transaction, scope: GovernanceScope) => {
    const db = getDb();
    const releases = await transaction.get(
        db.collection(RELEASE_COLLECTION)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', scope.tId)
            .where('sId', '==', scope.sId)
            .where('status', '==', 'active')
            .orderBy('versionNormalized', 'desc')
            .limit(1),
    );
    const version = releases.empty ? DEFAULT_VERSION : Number(releases.docs[0].data().versionNormalized);
    return Number.isInteger(version) && version > 0 ? version : DEFAULT_VERSION;
};

const assertEntityBindings = async (
    transaction: Transaction,
    scope: GovernanceScope,
    entityIds: string[],
    requireActive: boolean,
) => {
    const db = getDb();
    for (const entityId of entityIds) {
        const snapshot = await transaction.get(db.collection(ENTITY_COLLECTION).doc(entityId));
        if (!snapshot.exists || !documentIsInScope(snapshot.data() || {}, scope)) {
            throw new AnswerlatticeGovernanceError('canonical_entity_not_found', 409, 'A bound product entity is no longer available.');
        }
        if (requireActive && snapshot.data()?.status === 'deprecated') {
            throw new AnswerlatticeGovernanceError('canonical_entity_deprecated', 409, 'An active answer cannot use a deprecated product entity.');
        }
    }
};

const assertNoActiveOverlap = async (
    transaction: Transaction,
    scope: GovernanceScope,
    candidate: Record<string, any>,
    candidateId: string,
) => {
    if (candidate.status !== 'active') return;
    const db = getDb();
    const snapshot = await transaction.get(
        db.collection(CANONICAL_COLLECTION)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', scope.tId)
            .where('sId', '==', scope.sId)
            .where('status', '==', 'active')
            .limit(MAX_GOVERNANCE_QUERY_DOCUMENTS + 1),
    );
    if (snapshot.size > MAX_GOVERNANCE_QUERY_DOCUMENTS) {
        throw new AnswerlatticeGovernanceError(
            'canonical_overlap_query_limit',
            409,
            'This workspace has too many active answers for a safe automatic conflict check. Contact support for a controlled review.',
        );
    }
    for (const document of snapshot.docs) {
        if (document.id === candidateId) continue;
        const existing = { ...document.data(), id: document.id };
        if (!documentIsInScope(existing, scope)) {
            throw new AnswerlatticeGovernanceError('canonical_scope_integrity_invalid', 409);
        }
        if (answersConflict(candidate, existing)) {
            throw new AnswerlatticeGovernanceError(
                'canonical_version_scope_overlap',
                409,
                'Another active answer already covers this entity, scope, and version window.',
            );
        }
    }
};

const proposalHasApplicableChange = (proposal: Record<string, any>) => {
    const suggested = proposal.suggestedChange || {};
    if (proposal.mutationType === 'new_answer_required') {
        return suggested.draftStatus === 'generated' && Boolean(suggested.draftTitle);
    }
    return Boolean(
        suggested.proposedContent
        || suggested.proposedScope
        || suggested.proposedProductBinding
        || suggested.proposedStatus
        || suggested.proposedAnswerType
        || suggested.draftTitle
        || suggested.structuredSummary
        || suggested.detailedExplanation
        || suggested.edgeCases
        || suggested.constraints
        || suggested.procedure
        || suggested.rollbackAuditLogId,
    );
};

export const buildAnswerlatticeCandidateFromProposal = (
    proposal: Record<string, any>,
    currentAnswer: Record<string, any> | null,
    latestVersion: number,
    actor: GovernanceActor,
    editedContent?: AnswerlatticeGovernanceEditedContent,
    validationTimestamp: unknown = FieldValue.serverTimestamp(),
) => {
    const suggested = proposal.suggestedChange || {};
    const currentContent = currentAnswer?.content || {};
    const proposedContent = suggested.proposedContent || {};
    const title = editedContent?.title || suggested.draftTitle || currentAnswer?.title;
    const contentCandidate = {
        structuredSummary: editedContent?.structuredSummary
            ?? proposedContent.structuredSummary
            ?? suggested.structuredSummary
            ?? currentContent.structuredSummary,
        detailedExplanation: editedContent?.detailedExplanation
            ?? proposedContent.detailedExplanation
            ?? suggested.detailedExplanation
            ?? currentContent.detailedExplanation,
        ...(normalizeOptionalText(editedContent?.edgeCases ?? proposedContent.edgeCases ?? suggested.edgeCases ?? currentContent.edgeCases)
            ? { edgeCases: normalizeOptionalText(editedContent?.edgeCases ?? proposedContent.edgeCases ?? suggested.edgeCases ?? currentContent.edgeCases) }
            : {}),
        ...(normalizeOptionalText(editedContent?.constraints ?? proposedContent.constraints ?? suggested.constraints ?? currentContent.constraints)
            ? { constraints: normalizeOptionalText(editedContent?.constraints ?? proposedContent.constraints ?? suggested.constraints ?? currentContent.constraints) }
            : {}),
        ...((proposedContent.procedure || suggested.procedure || currentContent.procedure)
            ? { procedure: proposedContent.procedure || suggested.procedure || currentContent.procedure }
            : {}),
    };
    const answerType = suggested.proposedAnswerType
        || ((contentCandidate.procedure || suggested.procedure) ? 'procedure' : undefined)
        || currentAnswer?.answerType
        || 'explanation';
    const {
        procedure: candidateProcedure,
        ...contentWithoutProcedure
    } = contentCandidate;
    const procedure = candidateProcedure || suggested.procedure || currentContent.procedure;
    const content = answerType === 'procedure' && procedure
        ? { ...contentWithoutProcedure, procedure }
        : contentWithoutProcedure;
    if (!title || !content.structuredSummary || !content.detailedExplanation) {
        throw new AnswerlatticeGovernanceError('canonical_proposal_incomplete', 409, 'The proposal does not contain a complete answer.');
    }

    const proposedBinding = suggested.proposedProductBinding || currentAnswer?.productBinding || {
        introducedInVersion: latestVersion,
        lastValidatedInVersion: latestVersion,
        applicableVersions: { from: latestVersion, to: null },
    };
    const productBinding = {
        ...proposedBinding,
        lastValidatedInVersion: Math.max(Number(proposedBinding.lastValidatedInVersion || 0), latestVersion),
    };
    const scope = suggested.proposedScope || currentAnswer?.scope || {
        entityIds: normalizeAnswerlatticeResolvedEntityIds(proposal.relatedEntityIds, 25),
    };
    const status = suggested.proposedStatus || currentAnswer?.status || 'active';
    const evidenceSource = suggested.proposedEvidence || currentAnswer?.evidence || { sourceIds: [], citations: [] };
    const evidence = normalizeCanonicalEvidence({
        sourceIds: evidenceSource.sourceIds || [],
        citations: editedContent?.citations ?? evidenceSource.citations ?? [],
    });

    return {
        ...(currentAnswer || {}),
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: Number(proposal.tId),
        sId: Number(proposal.sId),
        title: String(title).trim(),
        slug: buildSlug(String(title)),
        status,
        answerType,
        scope,
        productBinding,
        content,
        evidence,
        validation: {
            ...(currentAnswer?.validation || {}),
            // Proposal scores describe extraction or evidence volume. They must
            // never become canonical answer correctness after human approval.
            confidenceScore: 1,
            validationSource: 'manual',
            lastValidatedOn: validationTimestamp,
            validatedBy: actor.label,
        },
        signalMetrics: currentAnswer?.signalMetrics || {
            linkedTicketCount: Number(proposal.signalSummary?.ticketCount || 0),
            linkedChatCount: Number(proposal.signalSummary?.chatCount || 0),
            negativeFeedbackCount: 0,
        },
        governance: {
            driftFlag: false,
            reviewRequired: false,
        },
    };
};

type AnswerlatticeProposalImpactAnswerSummary = {
    answerId: string;
    title: string;
    status: 'active' | 'needs_review' | 'deprecated' | 'archived';
    answerType: 'explanation' | 'navigation' | 'procedure';
    entityIds: string[];
    versionFrom: number;
    versionTo: number | null;
    structuredSummary: string;
};

export type AnswerlatticePreparedProposalImpact = {
    proposalId: string;
    targetAnswerId: string | null;
    relatedEntityIds: string[];
    candidate: AnswerlatticeCanonicalAnswer;
    candidateSummary: AnswerlatticeProposalImpactAnswerSummary;
    currentAnswerSummary: AnswerlatticeProposalImpactAnswerSummary | null;
    currentVersion: number;
};

const buildProposalImpactAnswerSummary = (
    answerId: string,
    answer: Record<string, any>,
): AnswerlatticeProposalImpactAnswerSummary => ({
    answerId,
    title: String(answer.title),
    status: answer.status,
    answerType: answer.answerType || 'explanation',
    entityIds: normalizeAnswerlatticeResolvedEntityIds(answer.scope?.entityIds, 25),
    versionFrom: Number(answer.productBinding?.applicableVersions?.from),
    versionTo: answer.productBinding?.applicableVersions?.to == null
        ? null
        : Number(answer.productBinding.applicableVersions.to),
    structuredSummary: String(answer.content?.structuredSummary || ''),
});

/**
 * Builds the exact in-memory canonical candidate used by approval without
 * performing approval's entity/overlap scans or any write.
 */
export async function prepareAnswerlatticeProposalImpact({
    access,
    editedContent,
    proposalId: rawProposalId,
}: {
    access: AnswerlatticeGovernanceAccess;
    editedContent?: AnswerlatticeGovernanceEditedContent;
    proposalId: string;
}): Promise<AnswerlatticePreparedProposalImpact> {
    const db = getDb();
    const { scope, actor } = getScopeAndActor(access);
    const proposalId = normalizeAnswerlatticeMutationProposalId(rawProposalId);
    if (!proposalId) throw new AnswerlatticeGovernanceError('proposal_id_invalid', 400, 'The proposal identifier is invalid.');

    const proposalSnapshot = await db.collection(PROPOSAL_COLLECTION).doc(proposalId).get();
    if (!proposalSnapshot.exists || !documentIsInScope(proposalSnapshot.data() || {}, scope)) {
        throw new AnswerlatticeGovernanceError('proposal_not_found', 404, 'The proposal is no longer available.');
    }
    const parsedProposal = AnswerlatticeStoredMutationProposalSchema.safeParse({
        ...proposalSnapshot.data(),
        id: proposalSnapshot.id,
    });
    if (!parsedProposal.success) {
        throw new AnswerlatticeGovernanceError(
            'proposal_document_invalid',
            409,
            'This proposal contains invalid stored data and cannot be checked safely.',
        );
    }
    const proposal = parsedProposal.data;
    if (proposal.status !== 'pending_review') {
        throw new AnswerlatticeGovernanceError(
            'proposal_state_invalid',
            409,
            'Only pending proposals can be checked before approval.',
        );
    }
    if (!proposalHasApplicableChange(proposal)) {
        throw new AnswerlatticeGovernanceError(
            'proposal_change_missing',
            409,
            'This proposal does not contain an answer change to check.',
        );
    }

    const targetAnswerId = normalizeAnswerlatticeCanonicalAnswerId(proposal.targetAnswerId);
    const currentAnswerPromise = targetAnswerId
        ? db.collection(CANONICAL_COLLECTION).doc(targetAnswerId).get()
        : Promise.resolve(null);
    const latestReleasePromise = db.collection(RELEASE_COLLECTION)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
        .where('status', '==', 'active')
        .orderBy('versionNormalized', 'desc')
        .limit(1)
        .get();
    const [currentSnapshot, latestReleaseSnapshot] = await Promise.all([
        currentAnswerPromise,
        latestReleasePromise,
    ]);

    let currentAnswer: Record<string, any> | null = null;
    if (targetAnswerId) {
        if (!currentSnapshot || !currentSnapshot.exists || !documentIsInScope(currentSnapshot.data() || {}, scope)) {
            throw new AnswerlatticeGovernanceError('canonical_answer_not_found', 404, 'The target answer is no longer available.');
        }
        currentAnswer = { ...currentSnapshot.data(), id: currentSnapshot.id };
        parseAnswerlatticeRetrievalCanonicalAnswer(currentAnswer, scope);
        assertProposalBaseAnswerIsCurrent(proposal, currentAnswer);
    }

    const rawLatestVersion = latestReleaseSnapshot.empty
        ? DEFAULT_VERSION
        : Number(latestReleaseSnapshot.docs[0].data().versionNormalized);
    const currentVersion = Number.isInteger(rawLatestVersion) && rawLatestVersion > 0
        ? rawLatestVersion
        : DEFAULT_VERSION;
    const candidateRecord = buildAnswerlatticeCandidateFromProposal(
        proposal,
        currentAnswer,
        currentVersion,
        actor,
        editedContent,
        Timestamp.now(),
    );
    assertCanonicalCandidate(candidateRecord);
    const answerId = targetAnswerId || `canonical_${hashValue(proposalId)}`;
    const candidate = parseAnswerlatticeRetrievalCanonicalAnswer(
        { ...candidateRecord, id: answerId },
        scope,
    );
    const affectedEntityIds = buildAnswerlatticeProposalImpactAffectedEntityIds(
        proposal.relatedEntityIds,
        currentAnswer?.scope?.entityIds || [],
        candidate.scope.entityIds,
    );

    return {
        proposalId,
        targetAnswerId: targetAnswerId || null,
        relatedEntityIds: affectedEntityIds,
        candidate,
        candidateSummary: buildProposalImpactAnswerSummary(answerId, candidate),
        currentAnswerSummary: currentAnswer && targetAnswerId
            ? buildProposalImpactAnswerSummary(targetAnswerId, currentAnswer)
            : null,
        currentVersion,
    };
}

async function proposeCanonicalAnswer(
    action: Extract<AnswerlatticeGovernanceAction, { action: 'propose_create' | 'propose_update' }>,
    scope: GovernanceScope,
    actor: GovernanceActor,
): Promise<AnswerlatticeGovernanceActionResult> {
    const db = getDb();
    const answer = action.answer as AnswerlatticeCanonicalProposalAnswer;
    assertCanonicalCandidate({
        ...answer,
        governance: {
            driftFlag: false,
            reviewRequired: false,
        },
    });
    const answerId = action.action === 'propose_update'
        ? normalizeAnswerlatticeCanonicalAnswerId(action.answerId)
        : null;
    const operationHash = hashValue(`${scope.tId}:${scope.sId}:${action.action}:${action.requestId}`);
    const requestFingerprint = hashValue(stableSerialize({
        action: action.action,
        answerId: answerId || '',
        answer,
    }), 64);
    const proposalId = `manual_${operationHash}`;
    const proposalRef = db.collection(PROPOSAL_COLLECTION).doc(proposalId);
    const auditRef = db.collection(AUDIT_COLLECTION).doc(`proposal_${operationHash}`);

    const result = await db.runTransaction(async transaction => {
        const existing = await transaction.get(proposalRef);
        if (existing.exists) {
            const existingData = existing.data() || {};
            if (!documentIsInScope(existingData, scope)) {
                throw new AnswerlatticeGovernanceError('proposal_idempotency_scope_conflict', 409);
            }
            if (existingData.requestFingerprint !== requestFingerprint) {
                throw new AnswerlatticeGovernanceError(
                    'proposal_idempotency_payload_conflict',
                    409,
                    'This request identifier was already used for different answer content.',
                );
            }
            return { created: false, status: existingData.status as AnswerlatticeGovernanceActionResult['status'] };
        }

        let currentAnswer: Record<string, any> | null = null;
        if (answerId) {
            const current = await transaction.get(db.collection(CANONICAL_COLLECTION).doc(answerId));
            if (!current.exists || !documentIsInScope(current.data() || {}, scope)) {
                throw new AnswerlatticeGovernanceError('canonical_answer_not_found', 404, 'The canonical answer is no longer available.');
            }
            currentAnswer = current.data() || {};
        }

        await assertEntityBindings(transaction, scope, answer.scope.entityIds, answer.status === 'active');
        const now = FieldValue.serverTimestamp();
        const mutationType = action.action === 'propose_create'
            ? 'new_answer_required'
            : JSON.stringify(currentAnswer?.scope || {}) !== JSON.stringify(answer.scope)
                ? 'scope_adjustment'
                : JSON.stringify(currentAnswer?.productBinding || {}) !== JSON.stringify(answer.productBinding)
                    ? 'version_update'
                    : 'content_refinement';
        const suggestedChange = {
            draftTitle: answer.title,
            draftStatus: 'generated',
            draftSource: 'manual_authoring',
            structuredSummary: answer.content.structuredSummary,
            detailedExplanation: answer.content.detailedExplanation,
            ...(answer.content.edgeCases ? { edgeCases: answer.content.edgeCases } : {}),
            ...(answer.content.constraints ? { constraints: answer.content.constraints } : {}),
            ...(answer.content.procedure ? { procedure: answer.content.procedure } : {}),
            proposedContent: answer.content,
            proposedScope: answer.scope,
            proposedProductBinding: answer.productBinding,
            proposedStatus: answer.status,
            proposedAnswerType: answer.answerType,
            ...(answer.evidence ? { proposedEvidence: answer.evidence } : {}),
            ...(currentAnswer ? { baseAnswerFingerprint: buildAnswerFingerprint(currentAnswer) } : {}),
        };

        transaction.create(proposalRef, {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: scope.tId,
            sId: scope.sId,
            targetAnswerId: answerId || '',
            relatedEntityIds: answer.scope.entityIds,
            mutationType,
            signalSummary: {
                ticketCount: 0,
                chatCount: 0,
                negativeFeedbackRate: 0,
                exampleReferences: [`manual_authoring:${operationHash}`],
            },
            suggestedChange,
            confidenceScore: 1,
            status: 'pending_review',
            requestId: action.requestId,
            requestFingerprint,
            traceId: action.requestId,
            createdOn: now,
            modifiedOn: now,
            createdBy: actor.label,
            modifiedBy: actor.label,
        });
        transaction.create(auditRef, {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: scope.tId,
            sId: scope.sId,
            action: action.action === 'propose_create' ? 'canonical_answer_create_proposed' : 'canonical_answer_update_proposed',
            entityType: 'mutationProposal',
            entityId: proposalId,
            previousState: answerId ? { answerId } : null,
            newState: { status: 'pending_review', mutationType, relatedEntityIds: answer.scope.entityIds },
            performedBy: actor.label,
            timestamp: now,
            createdOn: now,
        });
        return { created: true, status: 'pending_review' as const };
    });

    return {
        success: true,
        action: action.action,
        proposalId,
        status: result.status,
        created: result.created,
    };
}

async function approveProposal(
    action: Extract<AnswerlatticeGovernanceAction, { action: 'approve_proposal' }>,
    scope: GovernanceScope,
    actor: GovernanceActor,
): Promise<AnswerlatticeGovernanceActionResult> {
    const db = getDb();
    const proposalId = normalizeAnswerlatticeMutationProposalId(action.proposalId);
    if (!proposalId) throw new AnswerlatticeGovernanceError('proposal_id_invalid', 400);
    const proposalRef = db.collection(PROPOSAL_COLLECTION).doc(proposalId);

    const result = await db.runTransaction(async transaction => {
        const proposalSnapshot = await transaction.get(proposalRef);
        if (!proposalSnapshot.exists || !documentIsInScope(proposalSnapshot.data() || {}, scope)) {
            throw new AnswerlatticeGovernanceError('proposal_not_found', 404, 'The proposal is no longer available.');
        }
        const parsedProposal = AnswerlatticeStoredMutationProposalSchema.safeParse({
            ...proposalSnapshot.data(),
            id: proposalSnapshot.id,
        });
        if (!parsedProposal.success) {
            throw new AnswerlatticeGovernanceError(
                'proposal_document_invalid',
                409,
                'This proposal contains invalid stored data and cannot be applied safely.',
            );
        }
        const proposal = parsedProposal.data;
        if (proposal.status === 'implemented' && proposal.implementedAnswerId) {
            return { answerId: proposal.implementedAnswerId, status: 'implemented' as const };
        }
        const hasApplicableChange = proposalHasApplicableChange(proposal);
        if (proposal.status === 'approved' && !hasApplicableChange) {
            return { answerId: undefined, status: 'approved' as const };
        }
        if (proposal.status !== 'pending_review' && !(proposal.status === 'approved' && hasApplicableChange)) {
            throw new AnswerlatticeGovernanceError('proposal_state_invalid', 409, 'Only pending proposals can be approved.');
        }

        if (!hasApplicableChange) {
            const now = FieldValue.serverTimestamp();
            transaction.update(proposalRef, {
                status: 'approved',
                reviewedBy: actor.label,
                reviewedOn: now,
                modifiedBy: actor.label,
                modifiedOn: now,
            });
            transaction.create(db.collection(AUDIT_COLLECTION).doc(`proposal_approved_${hashValue(proposalId)}`), {
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: scope.tId,
                sId: scope.sId,
                action: 'mutation_proposal_approved',
                entityType: 'mutationProposal',
                entityId: proposalId,
                previousState: { status: 'pending_review' },
                newState: { status: 'approved', requiresImplementation: true },
                performedBy: actor.label,
                timestamp: now,
                createdOn: now,
            });
            return { answerId: undefined, status: 'approved' as const };
        }

        const targetAnswerId = normalizeAnswerlatticeCanonicalAnswerId(proposal.targetAnswerId);
        let currentAnswer: Record<string, any> | null = null;
        if (targetAnswerId) {
            const currentSnapshot = await transaction.get(db.collection(CANONICAL_COLLECTION).doc(targetAnswerId));
            if (!currentSnapshot.exists || !documentIsInScope(currentSnapshot.data() || {}, scope)) {
                throw new AnswerlatticeGovernanceError('canonical_answer_not_found', 404, 'The target answer is no longer available.');
            }
            currentAnswer = { ...currentSnapshot.data(), id: currentSnapshot.id };
            assertProposalBaseAnswerIsCurrent(proposal, currentAnswer);
        }

        const latestVersion = await getLatestActiveVersion(transaction, scope);
        const candidate = buildAnswerlatticeCandidateFromProposal(
            proposal,
            currentAnswer,
            latestVersion,
            actor,
            action.editedContent,
        );
        const entityIds = normalizeAnswerlatticeResolvedEntityIds(candidate.scope?.entityIds, 25);
        await assertEntityBindings(transaction, scope, entityIds, candidate.status === 'active');
        const answerId = targetAnswerId || `canonical_${hashValue(proposalId)}`;
        await assertNoActiveOverlap(transaction, scope, candidate, answerId);
        assertCanonicalCandidate(candidate);

        const answerRef = db.collection(CANONICAL_COLLECTION).doc(answerId);
        if (!targetAnswerId) {
            const existingAnswer = await transaction.get(answerRef);
            if (existingAnswer.exists && !documentIsInScope(existingAnswer.data() || {}, scope)) {
                throw new AnswerlatticeGovernanceError('canonical_idempotency_scope_conflict', 409);
            }
        }

        const invalidationOptions: InvalidationOptions = {
            reason: targetAnswerId ? 'canonical_answer_update' : 'canonical_answer_create',
            sourceId: answerId,
            canonical: true,
        };
        const invalidationOwnership = await readInvalidationOwnership(transaction, scope, invalidationOptions);
        const now = FieldValue.serverTimestamp();
        const answerWrite = {
            ...candidate,
            scope: { ...candidate.scope, entityIds },
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: scope.tId,
            sId: scope.sId,
            modifiedBy: actor.label,
            modifiedOn: now,
            ...(!targetAnswerId ? { createdBy: actor.label, createdOn: now } : {}),
        };
        delete (answerWrite as any).id;
        transaction.set(answerRef, answerWrite, { merge: Boolean(targetAnswerId) });
        transaction.update(proposalRef, {
            status: 'implemented',
            implementedOn: now,
            impactTracked: false,
            reviewedBy: actor.label,
            reviewedOn: now,
            implementedAnswerId: answerId,
            modifiedBy: actor.label,
            modifiedOn: now,
        });
        transaction.create(db.collection(AUDIT_COLLECTION).doc(`canonical_apply_${hashValue(proposalId)}`), {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: scope.tId,
            sId: scope.sId,
            action: targetAnswerId ? 'canonical_answer_updated' : 'draft_approved_as_canonical_answer',
            entityType: 'canonicalAnswer',
            entityId: answerId,
            previousState: currentAnswer
                ? { answerSnapshot: buildAnswerSnapshot(currentAnswer), proposalStatus: proposal.status }
                : { proposalId, proposalStatus: proposal.status },
            newState: { answerSnapshot: buildAnswerSnapshot(answerWrite), proposalId, status: 'implemented' },
            performedBy: actor.label,
            timestamp: now,
            createdOn: now,
        });
        addInvalidationWrites(transaction, scope, invalidationOwnership, invalidationOptions);
        return { answerId, status: 'implemented' as const };
    });

    return {
        success: true,
        action: action.action,
        proposalId,
        answerId: result.answerId,
        status: result.status,
    };
}

async function updateProposalStatus(
    action: Extract<AnswerlatticeGovernanceAction, { action: 'reject_proposal' | 'mark_implemented' }>,
    scope: GovernanceScope,
    actor: GovernanceActor,
): Promise<AnswerlatticeGovernanceActionResult> {
    const db = getDb();
    const proposalId = normalizeAnswerlatticeMutationProposalId(action.proposalId);
    if (!proposalId) throw new AnswerlatticeGovernanceError('proposal_id_invalid', 400);
    const proposalRef = db.collection(PROPOSAL_COLLECTION).doc(proposalId);
    const targetStatus = action.action === 'reject_proposal' ? 'rejected' : 'implemented';
    const requiredStatus = action.action === 'reject_proposal' ? 'pending_review' : 'approved';

    const status = await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(proposalRef);
        if (!snapshot.exists || !documentIsInScope(snapshot.data() || {}, scope)) {
            throw new AnswerlatticeGovernanceError('proposal_not_found', 404, 'The proposal is no longer available.');
        }
        const parsedProposal = AnswerlatticeStoredMutationProposalSchema.safeParse({
            ...snapshot.data(),
            id: snapshot.id,
        });
        if (!parsedProposal.success) {
            throw new AnswerlatticeGovernanceError(
                'proposal_document_invalid',
                409,
                'This proposal contains invalid stored data and cannot be updated safely.',
            );
        }
        const proposal = parsedProposal.data;
        const currentStatus = proposal.status;
        if (currentStatus === targetStatus) return targetStatus;
        if (currentStatus !== requiredStatus) {
            throw new AnswerlatticeGovernanceError('proposal_state_invalid', 409, `Only ${requiredStatus.replace('_', ' ')} proposals can be updated.`);
        }
        if (action.action === 'mark_implemented' && proposalHasApplicableChange(proposal)) {
            throw new AnswerlatticeGovernanceError(
                'proposal_implementation_bypass_blocked',
                409,
                'Apply this approved answer change through the governed approval action.',
            );
        }

        const now = FieldValue.serverTimestamp();
        transaction.update(proposalRef, {
            status: targetStatus,
            ...(targetStatus === 'implemented' ? { implementedOn: now, impactTracked: false } : {}),
            reviewedBy: actor.label,
            reviewedOn: now,
            modifiedBy: actor.label,
            modifiedOn: now,
        });
        transaction.create(db.collection(AUDIT_COLLECTION).doc(`${targetStatus}_${hashValue(proposalId)}`), {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: scope.tId,
            sId: scope.sId,
            action: action.action === 'reject_proposal' ? 'mutation_proposal_rejected' : 'mutation_proposal_marked_implemented',
            entityType: 'mutationProposal',
            entityId: proposalId,
            previousState: { status: requiredStatus },
            newState: { status: targetStatus },
            performedBy: actor.label,
            timestamp: now,
            createdOn: now,
        });
        return targetStatus;
    });

    return {
        success: true,
        action: action.action,
        proposalId,
        status: status as 'rejected' | 'implemented',
    };
}

async function evaluateDrift(
    action: Extract<AnswerlatticeGovernanceAction, { action: 'evaluate_drift' }>,
    scope: GovernanceScope,
    actor: GovernanceActor,
): Promise<AnswerlatticeGovernanceActionResult> {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_DRIFT_DETECTION) {
        throw new AnswerlatticeGovernanceError('answerlattice_drift_disabled', 403, 'Drift evaluation is not enabled.');
    }
    const db = getDb();
    const windowStart = Timestamp.fromMillis(Date.now() - 14 * 24 * 60 * 60 * 1_000);
    const [answersSnapshot, entitiesSnapshot, signalsSnapshot] = await Promise.all([
        db.collection(CANONICAL_COLLECTION)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', scope.tId)
            .where('sId', '==', scope.sId)
            .where('status', '==', 'active')
            .limit(MAX_GOVERNANCE_QUERY_DOCUMENTS + 1)
            .get(),
        db.collection(ENTITY_COLLECTION)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', scope.tId)
            .where('sId', '==', scope.sId)
            .limit(MAX_DRIFT_ENTITY_DOCUMENTS + 1)
            .get(),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', scope.tId)
            .where('sId', '==', scope.sId)
            .where('timestamp', '>=', windowStart)
            .limit(MAX_DRIFT_SIGNAL_DOCUMENTS + 1)
            .get(),
    ]);

    if (
        answersSnapshot.size > MAX_GOVERNANCE_QUERY_DOCUMENTS
        || entitiesSnapshot.size > MAX_DRIFT_ENTITY_DOCUMENTS
        || signalsSnapshot.size > MAX_DRIFT_SIGNAL_DOCUMENTS
    ) {
        throw new AnswerlatticeGovernanceError(
            'answerlattice_drift_input_limit_exceeded',
            409,
            'This workspace is larger than one safe drift evaluation. Run the scheduled audit or reduce the review scope.',
        );
    }

    let answers: AnswerlatticeCanonicalAnswer[];
    let entities: AnswerlatticeEntity[];
    try {
        answers = answersSnapshot.docs.map(snapshot => parseAnswerlatticeRetrievalCanonicalAnswer(
            { ...snapshot.data(), id: snapshot.id },
            scope,
        ));
        entities = entitiesSnapshot.docs.map(snapshot => parseAnswerlatticeRetrievalEntity(
            { ...snapshot.data(), id: snapshot.id },
            scope,
        ));
    } catch {
        throw new AnswerlatticeGovernanceError(
            'answerlattice_drift_stored_input_invalid',
            409,
            'Stored answer or entity data must be repaired before drift can be evaluated.',
        );
    }

    const driftAnswers = answers.map(toDriftAnswer).sort((left, right) => left.id.localeCompare(right.id));
    const entitiesById = new Map<string, AnswerlatticeDriftEntity>(entities.map(entity => [entity.id, {
        id: entity.id,
        name: entity.name,
        status: entity.status,
    }]));
    const signalsByEntity = new Map<string, AnswerlatticeDriftSignal[]>();
    for (const snapshot of signalsSnapshot.docs) {
        const signal = snapshot.data() || {};
        const entityId = normalizeAnswerlatticeResolvedEntityId(signal.entityId);
        const signalScopeValid = documentIsInScope(signal, scope);
        const timestampMs = timestampToMillis(signal.timestamp);
        if (!signalScopeValid || !entityId || timestampMs <= 0) {
            throw new AnswerlatticeGovernanceError(
                'answerlattice_drift_signal_invalid',
                409,
                'Stored support signals must be repaired before drift can be evaluated.',
            );
        }
        if (signal.type !== 'ticket' && signal.type !== 'chat_negative') continue;
        const current = signalsByEntity.get(entityId) || [];
        current.push({ entityId, type: signal.type, timestampMs });
        signalsByEntity.set(entityId, current);
    }

    try {
        for (const answer of driftAnswers) {
            evaluateAnswerlatticeAutomatedDrift(answer, driftAnswers, entitiesById, signalsByEntity);
        }
    } catch {
        throw new AnswerlatticeGovernanceError(
            'answerlattice_drift_binding_invalid',
            409,
            'A canonical answer references product data that must be repaired before drift can be evaluated.',
        );
    }

    let updatedAnswers = 0;
    for (let offset = 0; offset < driftAnswers.length; offset += MAX_DRIFT_TRANSACTION_ANSWERS) {
        const chunk = driftAnswers.slice(offset, offset + MAX_DRIFT_TRANSACTION_ANSWERS);
        const chunkUpdated = await db.runTransaction(async transaction => {
            const snapshots = await transaction.getAll(...chunk.map(answer => (
                db.collection(CANONICAL_COLLECTION).doc(answer.id)
            )));
            const invalidationOptions: InvalidationOptions = {
                reason: 'canonical_answer_drift_detected',
                sourceId: `drift_evaluation_${offset}`,
                canonical: true,
            };
            const invalidationOwnership = await readInvalidationOwnership(transaction, scope, invalidationOptions);
            let changed = 0;
            const now = FieldValue.serverTimestamp();

            for (const snapshot of snapshots) {
                if (!snapshot.exists || !documentIsInScope(snapshot.data() || {}, scope)) continue;
                let currentAnswer: AnswerlatticeCanonicalAnswer;
                try {
                    currentAnswer = parseAnswerlatticeRetrievalCanonicalAnswer(
                        { ...snapshot.data(), id: snapshot.id },
                        scope,
                    );
                } catch {
                    throw new AnswerlatticeGovernanceError(
                        'answerlattice_drift_current_answer_invalid',
                        409,
                        'A canonical answer changed into an invalid state during drift evaluation.',
                    );
                }
                if (currentAnswer.status !== 'active') continue;
                const currentPrimitive = toDriftAnswer(currentAnswer);
                const evaluationAnswers = driftAnswers.map(answer => (
                    answer.id === currentPrimitive.id ? currentPrimitive : answer
                ));
                const evaluation = evaluateAnswerlatticeAutomatedDrift(
                    currentPrimitive,
                    evaluationAnswers,
                    entitiesById,
                    signalsByEntity,
                );
                const automatedState = deriveAutomatedDriftState(
                    currentAnswer.governance.driftFlag,
                    currentAnswer.governance.driftReason,
                    evaluation.driftReasons,
                );
                if (!automatedState.shouldWrite || !automatedState.driftReason) continue;

                transaction.update(snapshot.ref, {
                    'governance.driftFlag': true,
                    'governance.driftReason': automatedState.driftReason,
                    'governance.reviewRequired': true,
                    modifiedBy: actor.label,
                    modifiedOn: now,
                });
                transaction.create(
                    db.collection(AUDIT_COLLECTION).doc(`drift_${hashValue(`${snapshot.id}:${automatedState.driftReason}`, 40)}`),
                    {
                        pId: PRODUCT_IDS.ANSWERLATTICE,
                        tId: scope.tId,
                        sId: scope.sId,
                        action: 'drift_detected',
                        entityType: 'canonicalAnswer',
                        entityId: snapshot.id,
                        previousState: {
                            driftFlag: currentAnswer.governance.driftFlag,
                            driftReason: currentAnswer.governance.driftReason || null,
                        },
                        newState: { driftFlag: true, driftReason: automatedState.driftReason },
                        performedBy: actor.label,
                        timestamp: now,
                        createdOn: now,
                    },
                );
                changed += 1;
            }

            if (changed > 0) {
                addInvalidationWrites(transaction, scope, invalidationOwnership, invalidationOptions);
            }
            return changed;
        });
        updatedAnswers += chunkUpdated;
    }

    return {
        success: true,
        action: action.action,
        evaluatedAnswers: driftAnswers.length,
        updatedAnswers,
    };
}

async function validateDrift(
    action: Extract<AnswerlatticeGovernanceAction, { action: 'validate_drift' }>,
    scope: GovernanceScope,
    actor: GovernanceActor,
): Promise<AnswerlatticeGovernanceActionResult> {
    const db = getDb();
    const answerId = normalizeAnswerlatticeCanonicalAnswerId(action.answerId);
    if (!answerId) throw new AnswerlatticeGovernanceError('canonical_answer_id_invalid', 400);
    const answerRef = db.collection(CANONICAL_COLLECTION).doc(answerId);
    const auditRef = db.collection(AUDIT_COLLECTION).doc();

    await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(answerRef);
        if (!snapshot.exists || !documentIsInScope(snapshot.data() || {}, scope)) {
            throw new AnswerlatticeGovernanceError('canonical_answer_not_found', 404, 'The canonical answer is no longer available.');
        }
        const answer = snapshot.data() || {};
        if (answer.governance?.driftFlag !== true) return;
        const latestVersion = await getLatestActiveVersion(transaction, scope);
        const entityIds = normalizeAnswerlatticeResolvedEntityIds(answer.scope?.entityIds, 25);
        const nextProductBinding = {
            ...(answer.productBinding || {}),
            lastValidatedInVersion: Math.max(
                Number(answer.productBinding?.lastValidatedInVersion || 0),
                latestVersion,
            ),
        };
        const validatedCandidate = {
            ...answer,
            productBinding: nextProductBinding,
            scope: {
                ...(answer.scope || {}),
                entityIds,
            },
            governance: {
                driftFlag: false,
                reviewRequired: false,
            },
        };
        await assertEntityBindings(transaction, scope, entityIds, answer.status === 'active');
        await assertNoActiveOverlap(transaction, scope, validatedCandidate, answerId);
        assertCanonicalCandidate(validatedCandidate);
        const invalidationOptions: InvalidationOptions = {
            reason: 'canonical_answer_drift_validated',
            sourceId: answerId,
            canonical: true,
        };
        const invalidationOwnership = await readInvalidationOwnership(transaction, scope, invalidationOptions);
        const now = FieldValue.serverTimestamp();
        transaction.update(answerRef, {
            governance: {
                driftFlag: false,
                driftReason: null,
                reviewRequired: false,
            },
            validation: {
                ...(answer.validation || {}),
                validationSource: 'manual',
                lastValidatedOn: now,
                validatedBy: actor.label,
            },
            productBinding: nextProductBinding,
            modifiedBy: actor.label,
            modifiedOn: now,
        });
        transaction.create(auditRef, {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: scope.tId,
            sId: scope.sId,
            action: 'drift_manually_resolved',
            entityType: 'canonicalAnswer',
            entityId: answerId,
            previousState: { driftFlag: true, driftReason: answer.governance?.driftReason || null },
            newState: { driftFlag: false, lastValidatedInVersion: latestVersion },
            performedBy: actor.label,
            timestamp: now,
            createdOn: now,
        });
        addInvalidationWrites(transaction, scope, invalidationOwnership, invalidationOptions);
    });

    return { success: true, action: action.action, answerId };
}

async function mergeEntities(
    action: Extract<AnswerlatticeGovernanceAction, { action: 'merge_entities' }>,
    scope: GovernanceScope,
    actor: GovernanceActor,
): Promise<AnswerlatticeGovernanceActionResult> {
    const db = getDb();
    const survivorId = normalizeAnswerlatticeResolvedEntityId(action.survivorId);
    const mergedId = normalizeAnswerlatticeResolvedEntityId(action.mergedId);
    if (!survivorId || !mergedId || survivorId === mergedId) {
        throw new AnswerlatticeGovernanceError('entity_merge_ids_invalid', 400, 'Choose two different valid entities.');
    }
    const operationHash = hashValue(`${scope.tId}:${scope.sId}:${survivorId}:${mergedId}`);
    const operationAuditRef = db.collection(AUDIT_COLLECTION).doc(`entity_merge_${operationHash}`);
    const ontologyCounterRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`ontologyCounters_${scope.tId}_${scope.sId}`);
    const deterministicSurvivorIndexRef = db.collection(SEARCH_INDEX_COLLECTION)
        .doc(`entity_index_${hashValue(`${scope.tId}:${scope.sId}:${survivorId}`, 32)}`);

    const result = await db.runTransaction(async transaction => {
        const existingOperation = await transaction.get(operationAuditRef);
        if (existingOperation.exists) {
            const data = existingOperation.data() || {};
            if (!documentIsInScope(data, scope)) throw new AnswerlatticeGovernanceError('entity_merge_scope_conflict', 409);
            return {
                transferredAnswers: Number(data.newState?.transferredAnswers || 0),
                transferredArticles: Number(data.newState?.transferredArticles || 0),
                transferredFaqs: Number(data.newState?.transferredFaqs || 0),
                transferredRelations: Number(data.newState?.transferredRelations || 0),
                transferredSurfaces: Number(data.newState?.transferredSurfaces || 0),
            };
        }

        const survivorRef = db.collection(ENTITY_COLLECTION).doc(survivorId);
        const mergedRef = db.collection(ENTITY_COLLECTION).doc(mergedId);
        const survivorSnapshot = await transaction.get(survivorRef);
        const mergedSnapshot = await transaction.get(mergedRef);
        const ontologyCounterSnapshot = await transaction.get(ontologyCounterRef);
        if (!survivorSnapshot.exists || !mergedSnapshot.exists) {
            throw new AnswerlatticeGovernanceError('entity_merge_not_found', 404, 'One of the selected entities is no longer available.');
        }
        const survivor = { ...survivorSnapshot.data(), id: survivorSnapshot.id } as AnswerlatticeEntity;
        const merged = { ...mergedSnapshot.data(), id: mergedSnapshot.id } as AnswerlatticeEntity;
        if (!documentIsInScope(survivor as any, scope) || !documentIsInScope(merged as any, scope)) {
            throw new AnswerlatticeGovernanceError('entity_merge_scope_conflict', 404, 'One of the selected entities is no longer available.');
        }
        if (survivor.status === 'deprecated' || merged.status === 'deprecated') {
            throw new AnswerlatticeGovernanceError('entity_merge_deprecated', 409, 'Deprecated entities cannot be merged.');
        }
        if (survivor.type !== merged.type) {
            throw new AnswerlatticeGovernanceError('entity_merge_type_conflict', 409, 'Only entities of the same type can be merged.');
        }

        const answersSnapshot = await transaction.get(
            db.collection(CANONICAL_COLLECTION)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .where('scope.entityIds', 'array-contains', mergedId)
                .limit(MAX_ENTITY_MERGE_REFERENCES + 1),
        );
        const survivorActiveAnswersSnapshot = await transaction.get(
            db.collection(CANONICAL_COLLECTION)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .where('scope.entityIds', 'array-contains', survivorId)
                .where('status', '==', 'active')
                .limit(MAX_ENTITY_MERGE_REFERENCES + 1),
        );
        const articlesSnapshot = await transaction.get(
            db.collection(DB_COLLECTIONS.KB_ARTICLES)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .where('entityIds', 'array-contains', mergedId)
                .limit(MAX_ENTITY_MERGE_REFERENCES + 1),
        );
        const faqsSnapshot = await transaction.get(
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .limit(ANSWERLATTICE_FAQ_MANAGEMENT_LIMIT + 1),
        );
        const surfacesSnapshot = await transaction.get(
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .limit(ANSWERLATTICE_PRODUCT_SURFACE_LIMIT + 1),
        );
        const fromRelations = await transaction.get(
            db.collection(RELATION_COLLECTION)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .where('fromEntityId', '==', mergedId)
                .limit(MAX_ENTITY_MERGE_REFERENCES + 1),
        );
        const survivorFromRelations = await transaction.get(
            db.collection(RELATION_COLLECTION)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .where('fromEntityId', '==', survivorId)
                .limit(MAX_ENTITY_MERGE_REFERENCES + 1),
        );
        const survivorToRelations = await transaction.get(
            db.collection(RELATION_COLLECTION)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .where('toEntityId', '==', survivorId)
                .limit(MAX_ENTITY_MERGE_REFERENCES + 1),
        );
        const toRelations = await transaction.get(
            db.collection(RELATION_COLLECTION)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .where('toEntityId', '==', mergedId)
                .limit(MAX_ENTITY_MERGE_REFERENCES + 1),
        );
        const survivorIndexes = await transaction.get(
            db.collection(SEARCH_INDEX_COLLECTION)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .where('entityId', '==', survivorId)
                .limit(MAX_ENTITY_SEARCH_INDEX_RECORDS + 1),
        );
        const mergedIndexes = await transaction.get(
            db.collection(SEARCH_INDEX_COLLECTION)
                .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                .where('tId', '==', scope.tId)
                .where('sId', '==', scope.sId)
                .where('entityId', '==', mergedId)
                .limit(MAX_ENTITY_SEARCH_INDEX_RECORDS + 1),
        );
        const deterministicSurvivorIndexSnapshot = await transaction.get(deterministicSurvivorIndexRef);

        if (
            answersSnapshot.size > MAX_ENTITY_MERGE_REFERENCES
            || survivorActiveAnswersSnapshot.size > MAX_ENTITY_MERGE_REFERENCES
            || articlesSnapshot.size > MAX_ENTITY_MERGE_REFERENCES
            || faqsSnapshot.size > ANSWERLATTICE_FAQ_MANAGEMENT_LIMIT
            || surfacesSnapshot.size > ANSWERLATTICE_PRODUCT_SURFACE_LIMIT
            || fromRelations.size > MAX_ENTITY_MERGE_REFERENCES
            || toRelations.size > MAX_ENTITY_MERGE_REFERENCES
            || survivorFromRelations.size > MAX_ENTITY_MERGE_REFERENCES
            || survivorToRelations.size > MAX_ENTITY_MERGE_REFERENCES
            || survivorIndexes.size > MAX_ENTITY_SEARCH_INDEX_RECORDS
            || mergedIndexes.size > MAX_ENTITY_SEARCH_INDEX_RECORDS
        ) {
            throw new AnswerlatticeGovernanceError(
                'entity_merge_reference_limit',
                409,
                'This entity has too many references for one safe merge. Contact support for a controlled migration.',
            );
        }

        const changedSourceAnswers: Array<Record<string, any> & { id: string }> = answersSnapshot.docs
            .map(document => ({ ...document.data(), id: document.id }));
        if (changedSourceAnswers.some(answer => (
            !documentIsInScope(answer, scope)
            || !normalizeAnswerlatticeResolvedEntityIds(answer.scope?.entityIds, 25).includes(mergedId)
        ))) {
            throw new AnswerlatticeGovernanceError('entity_merge_answer_scope_invalid', 409);
        }
        if (survivorActiveAnswersSnapshot.docs.some(document => {
            const answer: Record<string, any> & { id: string } = { ...document.data(), id: document.id };
            return !documentIsInScope(answer, scope)
                || answer.status !== 'active'
                || !normalizeAnswerlatticeResolvedEntityIds(answer.scope?.entityIds, 25).includes(survivorId);
        })) {
            throw new AnswerlatticeGovernanceError('entity_merge_answer_scope_invalid', 409);
        }
        const changedAnswers: Array<{
            previous: Record<string, any> & { id: string };
            next: Record<string, any> & { id: string };
        }> = changedSourceAnswers
            .map(answer => ({
                previous: answer,
                next: {
                    ...answer,
                    scope: {
                        ...(answer.scope || {}),
                        entityIds: Array.from(new Set(
                            normalizeAnswerlatticeResolvedEntityIds(answer.scope?.entityIds, 25)
                                .map(entityId => entityId === mergedId ? survivorId : entityId),
                        )),
                    },
                },
            }));
        const changedArticles = articlesSnapshot.docs.map(document => {
            const article: Record<string, any> & { id: string } = {
                ...document.data(),
                id: document.id,
            };
            const nextEntityIds = replaceAnswerlatticeResolvedEntityReference(
                article.entityIds,
                mergedId,
                survivorId,
                MAX_KB_ARTICLE_ENTITY_IDS,
            );
            if (!documentIsInScope(article, scope) || !nextEntityIds) {
                throw new AnswerlatticeGovernanceError('entity_merge_article_scope_invalid', 409);
            }
            return {
                ref: document.ref,
                entityIds: nextEntityIds,
            };
        });
        const changedFaqs = faqsSnapshot.docs.flatMap(document => {
            const faq: Record<string, any> & { id: string } = { ...document.data(), id: document.id };
            if (!documentIsInScope(faq, scope)) {
                throw new AnswerlatticeGovernanceError('entity_merge_faq_scope_invalid', 409);
            }
            const currentEntityIds = normalizeAnswerlatticeResolvedEntityIds(
                faq.entityIds,
                MAX_SUPPORT_CONTENT_ENTITY_IDS,
            );
            if (!currentEntityIds.includes(mergedId)) return [];
            const nextEntityIds = replaceAnswerlatticeResolvedEntityReference(
                currentEntityIds,
                mergedId,
                survivorId,
                MAX_SUPPORT_CONTENT_ENTITY_IDS,
            );
            if (!nextEntityIds) throw new AnswerlatticeGovernanceError('entity_merge_faq_entity_ids_invalid', 409);
            return [{ ref: document.ref, entityIds: nextEntityIds }];
        });
        const changedSurfaces = surfacesSnapshot.docs.flatMap(document => {
            const surface: Record<string, any> & { id: string } = { ...document.data(), id: document.id };
            if (!documentIsInScope(surface, scope)) {
                throw new AnswerlatticeGovernanceError('entity_merge_surface_scope_invalid', 409);
            }
            const currentEntityIds = normalizeAnswerlatticeResolvedEntityIds(
                surface.entityIds,
                MAX_SUPPORT_CONTENT_ENTITY_IDS,
            );
            if (!currentEntityIds.includes(mergedId)) return [];
            const nextEntityIds = replaceAnswerlatticeResolvedEntityReference(
                currentEntityIds,
                mergedId,
                survivorId,
                MAX_SUPPORT_CONTENT_ENTITY_IDS,
            );
            if (!nextEntityIds) throw new AnswerlatticeGovernanceError('entity_merge_surface_entity_ids_invalid', 409);
            return [{ ref: document.ref, entityIds: nextEntityIds }];
        });
        const activeAnswersAfterMerge = new Map<string, Record<string, any> & { id: string }>();
        survivorActiveAnswersSnapshot.docs.forEach(document => {
            activeAnswersAfterMerge.set(document.id, { ...document.data(), id: document.id });
        });
        changedAnswers.forEach(({ next }) => {
            if (next.status === 'active') activeAnswersAfterMerge.set(next.id, next);
            else activeAnswersAfterMerge.delete(next.id);
        });
        const activeAnswers = Array.from(activeAnswersAfterMerge.values());
        for (let index = 0; index < activeAnswers.length; index += 1) {
            for (let comparisonIndex = index + 1; comparisonIndex < activeAnswers.length; comparisonIndex += 1) {
                if (answersConflict(activeAnswers[index], activeAnswers[comparisonIndex])) {
                    throw new AnswerlatticeGovernanceError(
                        'entity_merge_answer_overlap',
                        409,
                        'This merge would create overlapping active answers. Resolve the answer scopes first.',
                    );
                }
            }
        }

        const sourceRelationsById = new Map<string, AnswerlatticeEntityRelation>();
        [...fromRelations.docs, ...toRelations.docs].forEach(document => {
            const relation = { ...document.data(), id: document.id } as AnswerlatticeEntityRelation;
            if (!documentIsInScope(relation as any, scope)) {
                throw new AnswerlatticeGovernanceError('entity_merge_relation_scope_invalid', 409);
            }
            sourceRelationsById.set(document.id, relation);
        });
        const allRelevantRelationsById = new Map<string, AnswerlatticeEntityRelation>();
        [
            ...fromRelations.docs,
            ...toRelations.docs,
            ...survivorFromRelations.docs,
            ...survivorToRelations.docs,
        ].forEach(document => {
            const relation = { ...document.data(), id: document.id } as AnswerlatticeEntityRelation;
            if (!documentIsInScope(relation as any, scope)) {
                throw new AnswerlatticeGovernanceError('entity_merge_relation_scope_invalid', 409);
            }
            allRelevantRelationsById.set(document.id, relation);
        });
        const relationKey = (relation: Pick<AnswerlatticeEntityRelation, 'fromEntityId' | 'toEntityId' | 'relationType'>) => (
            `${relation.fromEntityId}:${relation.toEntityId}:${relation.relationType}`
        );
        const plannedRelationKeys = new Set(
            Array.from(allRelevantRelationsById.values())
                .filter(relation => !sourceRelationsById.has(relation.id))
                .map(relationKey),
        );
        const relationMutations = Array.from(sourceRelationsById.values()).map((relation) => {
            const fromEntityId = relation.fromEntityId === mergedId ? survivorId : relation.fromEntityId;
            const toEntityId = relation.toEntityId === mergedId ? survivorId : relation.toEntityId;
            const sourceRef = db.collection(RELATION_COLLECTION).doc(relation.id);
            if (fromEntityId === toEntityId) return { sourceRef, target: null };
            const nextRelation = { ...relation, fromEntityId, toEntityId };
            const key = relationKey(nextRelation);
            if (plannedRelationKeys.has(key)) return { sourceRef, target: null };
            plannedRelationKeys.add(key);
            const targetId = getEntityRelationId(scope, fromEntityId, toEntityId, relation.relationType);
            return {
                sourceRef,
                target: {
                    ref: db.collection(RELATION_COLLECTION).doc(targetId),
                    value: {
                        ...nextRelation,
                        id: targetId,
                        pId: PRODUCT_IDS.ANSWERLATTICE,
                        tId: scope.tId,
                        sId: scope.sId,
                    },
                },
            };
        });
        const relationTargetSnapshots = await Promise.all(relationMutations.flatMap(mutation => (
            mutation.target && mutation.target.ref.path !== mutation.sourceRef.path
                ? [transaction.get(mutation.target.ref).then(snapshot => ({ mutation, snapshot }))]
                : []
        )));
        for (const { mutation, snapshot } of relationTargetSnapshots) {
            if (snapshot.exists && mutation.target && !relationIsOwnedBy(snapshot.data(), scope, mutation.target.value)) {
                throw new AnswerlatticeGovernanceError(
                    'entity_merge_relation_target_conflict',
                    409,
                    'A rewritten entity relation identifier is already owned by another product or relationship.',
                );
            }
        }
        const combinedAliases = Array.from(new Set([
            ...(survivor.aliases || []),
            ...(merged.aliases || []),
            merged.name.toLowerCase().trim(),
        ].filter(Boolean))).slice(0, 20);
        const survivorIndexRef = survivorIndexes.docs[0]?.ref || deterministicSurvivorIndexRef;
        if (
            survivorIndexes.empty
            && deterministicSurvivorIndexSnapshot.exists
            && !searchIndexIsOwnedBy(deterministicSurvivorIndexSnapshot.data(), scope, survivorId)
        ) {
            throw new AnswerlatticeGovernanceError(
                'entity_merge_search_index_scope_invalid',
                409,
                'The survivor search index identifier is already owned by another product or entity.',
            );
        }
        const survivorIndexWeight = Number(survivorIndexes.docs[0]?.data()?.weight || 1);
        const survivorSearchIndex = buildEntitySearchIndex(
            { ...survivor, aliases: combinedAliases },
            scope,
            survivorIndexRef.id,
            Number.isFinite(survivorIndexWeight) ? Math.max(0.1, Math.min(10, survivorIndexWeight)) : 1,
        );
        const relationMutationWriteCount = relationMutations.reduce(
            (count, mutation) => count + 1 + (mutation.target && mutation.target.ref.path !== mutation.sourceRef.path ? 1 : 0),
            0,
        );
        const duplicateSurvivorIndexes = survivorIndexes.docs.filter(document => document.ref.path !== survivorIndexRef.path);
        const searchIndexWriteCount = 1 + duplicateSurvivorIndexes.length + mergedIndexes.size;
        const estimatedWrites = (changedAnswers.length * 2)
            + changedArticles.length
            + changedFaqs.length
            + changedSurfaces.length
            + relationMutationWriteCount
            + searchIndexWriteCount
            + 8;
        if (estimatedWrites > MAX_ENTITY_MERGE_WRITES) {
            throw new AnswerlatticeGovernanceError(
                'entity_merge_write_limit',
                409,
                'This entity has too many references for one safe merge. Contact support for a controlled migration.',
            );
        }

        const invalidationOptions: InvalidationOptions = {
            reason: 'entity_merge',
            sourceId: survivorId,
            canonical: changedAnswers.length > 0,
            entities: true,
            entityRelations: sourceRelationsById.size > 0,
            faqs: changedFaqs.length > 0,
            kb: changedArticles.length > 0,
            surfaces: changedSurfaces.length > 0,
        };
        const invalidationOwnership = await readInvalidationOwnership(transaction, scope, invalidationOptions);
        const now = FieldValue.serverTimestamp();
        for (const changed of changedAnswers) {
            const answerRef = db.collection(CANONICAL_COLLECTION).doc(changed.previous.id);
            transaction.update(answerRef, {
                scope: changed.next.scope,
                modifiedBy: actor.label,
                modifiedOn: now,
            });
            transaction.create(db.collection(AUDIT_COLLECTION).doc(`entity_merge_answer_${hashValue(`${operationHash}:${changed.previous.id}`)}`), {
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: scope.tId,
                sId: scope.sId,
                action: 'canonical_answer_updated',
                entityType: 'canonicalAnswer',
                entityId: changed.previous.id,
                previousState: { answerSnapshot: buildAnswerSnapshot(changed.previous) },
                newState: { answerSnapshot: buildAnswerSnapshot(changed.next), entityMergeId: operationHash },
                performedBy: actor.label,
                timestamp: now,
                createdOn: now,
            });
        }
        for (const article of changedArticles) {
            transaction.update(article.ref, {
                entityIds: article.entityIds,
                modifiedOn: now,
            });
        }
        for (const faq of changedFaqs) {
            transaction.update(faq.ref, {
                entityIds: faq.entityIds,
                modifiedOn: now,
            });
        }
        for (const surface of changedSurfaces) {
            transaction.update(surface.ref, {
                entityIds: surface.entityIds,
                modifiedOn: now,
            });
        }

        for (const mutation of relationMutations) {
            if (mutation.target) {
                transaction.set(mutation.target.ref, {
                    ...mutation.target.value,
                    modifiedOn: now,
                    modifiedBy: actor.label,
                });
            }
            if (!mutation.target || mutation.target.ref.path !== mutation.sourceRef.path) {
                transaction.delete(mutation.sourceRef);
            }
        }

        transaction.update(survivorRef, { aliases: combinedAliases, modifiedBy: actor.label, modifiedOn: now });
        transaction.update(mergedRef, { status: 'deprecated', modifiedBy: actor.label, modifiedOn: now });
        if (ontologyCounterSnapshot.exists) {
            transaction.update(ontologyCounterRef, {
                schemaVersion: 1,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: scope.tId,
                sId: scope.sId,
                relationCounts: {},
                relationCountsComplete: false,
                relationCountAccurate: false,
                updatedAt: now,
            });
        }
        survivorIndexes.docs.forEach(document => {
            const data = document.data() || {};
            if (!documentIsInScope(data, scope) || data.entityId !== survivorId) {
                throw new AnswerlatticeGovernanceError('entity_merge_search_index_scope_invalid', 409);
            }
            if (document.ref.path !== survivorIndexRef.path) transaction.delete(document.ref);
        });
        transaction.set(survivorIndexRef, {
            ...survivorSearchIndex,
            modifiedOn: now,
            modifiedBy: actor.label,
        }, { merge: true });
        mergedIndexes.docs.forEach(document => {
            const data = document.data() || {};
            if (!documentIsInScope(data, scope) || data.entityId !== mergedId) {
                throw new AnswerlatticeGovernanceError('entity_merge_search_index_scope_invalid', 409);
            }
            transaction.delete(document.ref);
        });
        transaction.create(operationAuditRef, {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: scope.tId,
            sId: scope.sId,
            action: 'entity_merged',
            entityType: 'entity',
            entityId: survivorId,
            previousState: { mergedEntityId: mergedId, mergedName: merged.name },
            newState: {
                survivorId,
                combinedAliases,
                transferredAnswers: changedAnswers.length,
                transferredArticles: changedArticles.length,
                transferredFaqs: changedFaqs.length,
                transferredRelations: sourceRelationsById.size,
                transferredSurfaces: changedSurfaces.length,
            },
            performedBy: actor.label,
            timestamp: now,
            createdOn: now,
        });
        addInvalidationWrites(transaction, scope, invalidationOwnership, invalidationOptions);
        return {
            transferredAnswers: changedAnswers.length,
            transferredArticles: changedArticles.length,
            transferredFaqs: changedFaqs.length,
            transferredRelations: sourceRelationsById.size,
            transferredSurfaces: changedSurfaces.length,
        };
    });

    return {
        success: true,
        action: action.action,
        transferredAnswers: result.transferredAnswers,
        transferredArticles: result.transferredArticles,
        transferredFaqs: result.transferredFaqs,
        transferredRelations: result.transferredRelations,
        transferredSurfaces: result.transferredSurfaces,
    };
}

export async function executeAnswerlatticeGovernanceAction(
    action: AnswerlatticeGovernanceAction,
    access: AnswerlatticeGovernanceAccess,
): Promise<AnswerlatticeGovernanceActionResult> {
    const { scope, actor } = getScopeAndActor(access);
    switch (action.action) {
        case 'propose_create':
        case 'propose_update':
            return proposeCanonicalAnswer(action, scope, actor);
        case 'approve_proposal':
            return approveProposal(action, scope, actor);
        case 'reject_proposal':
        case 'mark_implemented':
            return updateProposalStatus(action, scope, actor);
        case 'evaluate_drift':
            return evaluateDrift(action, scope, actor);
        case 'validate_drift':
            return validateDrift(action, scope, actor);
        case 'merge_entities':
            return mergeEntities(action, scope, actor);
    }
}
