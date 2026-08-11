import { PRODUCT_IDS } from '@constant/product';
import {
    ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS,
    ANSWERLATTICE_SOURCE_APPROVAL_STATUS,
    type AnswerlatticeSurfaceContentSummary,
} from '@type/answerlattice';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import {
    areAnswerlatticeCompiledSourceVersionsValid,
    compiledSourceVersionsEqual,
    getAnswerlatticeBundleRefPath,
    isAnswerlatticeContextBundleManifestForScope,
    normalizeAnswerlatticeStoredBundleVersion,
} from './compiledContext';
import { normalizeAnswerlatticeKnowledgeIntakeSourceId } from './knowledgeIntakeIdBoundary';
import {
    getAnswerlatticeProductSurfaceTimestampMillis,
    normalizeAnswerlatticeSurfaceContentSummary,
} from './productSurfaceContent';
import { z } from 'zod';

export const ANSWERLATTICE_SUPPORT_TRUTH_CHANGE_CONTROL_VERSION = 1;
export const ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT = 50;
export const ANSWERLATTICE_SOURCE_FRESHNESS_ITEM_LIMIT = 25;
export const ANSWERLATTICE_SURFACE_REVIEW_ITEM_LIMIT = 10;
export const ANSWERLATTICE_SURFACE_ROUTE_SAMPLE_LIMIT = 5;
export const ANSWERLATTICE_MAX_RELEASE_EVIDENCE_SOURCE_IDS = 4_000;

const documentIdSchema = z.string()
    .trim()
    .min(1)
    .max(180)
    .refine(isValidFirestoreDocumentId, 'Invalid Firestore document ID');
const entityIdsSchema = z.array(documentIdSchema).max(25);
const countSchema = (max: number) => z.number().int().nonnegative().max(max);
const nullableIsoDateTimeSchema = z.string().datetime({ offset: true }).nullable();
const nullableDateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

export const AnswerlatticeSourceFreshnessReasonSchema = z.enum([
    'record_missing',
    'record_invalid',
    'governance_unreviewed',
    'not_approved',
    'review_date_missing',
    'review_due',
    'not_yet_effective',
    'conflict_recorded',
    'source_not_ready',
]);

export const AnswerlatticeReleaseTruthReviewSchema = z.object({
    state: z.enum(['ready', 'attention']),
    mappingScope: z.literal('direct_entity_links_only'),
    changedEntityCount: countSchema(25),
    directActiveAnswerCount: countSchema(200),
    reviewRequiredCount: countSchema(200),
    answerTestState: z.enum([
        'not_requested',
        'permission_required',
        'no_linked_tests',
        'missing',
        'stale',
        'ready',
        'review',
        'blocked',
    ]),
    entityIdsWithoutVisibleDirectLinks: entityIdsSchema,
}).strict();

export const AnswerlatticeSourceFreshnessWatchSchema = z.object({
    state: z.enum(['not_enabled', 'unavailable', 'no_linked_sources', 'ready', 'attention', 'partial']),
    mappingScope: z.literal('direct_canonical_evidence_ids'),
    checkedAt: z.string().datetime({ offset: true }),
    totalEvidenceSourceCount: countSchema(ANSWERLATTICE_MAX_RELEASE_EVIDENCE_SOURCE_IDS),
    governanceEligibleSourceCount: countSchema(ANSWERLATTICE_MAX_RELEASE_EVIDENCE_SOURCE_IDS),
    checkedSourceCount: countSchema(ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT),
    approvedCount: countSchema(ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT),
    unreviewedCount: countSchema(ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT),
    nonApprovedCount: countSchema(ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT),
    reviewDateMissingCount: countSchema(ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT),
    reviewDueCount: countSchema(ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT),
    notYetEffectiveCount: countSchema(ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT),
    conflictCount: countSchema(ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT),
    missingCount: countSchema(ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT),
    invalidCount: countSchema(ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT),
    invalidEvidenceReferenceCount: countSchema(ANSWERLATTICE_MAX_RELEASE_EVIDENCE_SOURCE_IDS),
    untrackedSourceCount: countSchema(ANSWERLATTICE_MAX_RELEASE_EVIDENCE_SOURCE_IDS),
    truncated: z.boolean(),
    items: z.array(z.object({
        sourceId: documentIdSchema,
        title: z.string().trim().min(1).max(180).nullable(),
        status: z.enum(['processing', 'ready', 'needs_text', 'failed']).nullable(),
        approvalStatus: z.enum(['unreviewed', 'approved', 'excluded', 'superseded']).nullable(),
        reviewDate: nullableDateOnlySchema,
        linkedAnswerCount: countSchema(200),
        reasons: z.array(AnswerlatticeSourceFreshnessReasonSchema).max(9),
    }).strict()).max(ANSWERLATTICE_SOURCE_FRESHNESS_ITEM_LIMIT),
}).strict();

export const AnswerlatticeCrossSurfaceReviewSchema = z.object({
    state: z.enum(['available', 'missing', 'invalid', 'partial']),
    mappingScope: z.literal('direct_surface_entity_links'),
    summaryGeneratedAt: nullableIsoDateTimeSchema,
    summarySurfaceCount: countSchema(300),
    mappedSurfaceCount: countSchema(300),
    sampledSurfaceCount: countSchema(ANSWERLATTICE_SURFACE_REVIEW_ITEM_LIMIT),
    changedEntityIds: entityIdsSchema,
    mappedEntityIds: entityIdsSchema,
    entityIdsWithoutDirectSurfaceLinks: entityIdsSchema,
    visibleMappedArticleCount: countSchema(7_500),
    visibleMappedFaqCount: countSchema(7_500),
    visibleMappedChangelogCount: countSchema(7_500),
    items: z.array(z.object({
        key: z.string().trim().min(1).max(80),
        label: z.string().trim().min(1).max(120),
        matchedEntityIds: entityIdsSchema,
        routePatternCount: countSchema(25),
        routePatterns: z.array(z.string().trim().min(1).max(180)).max(ANSWERLATTICE_SURFACE_ROUTE_SAMPLE_LIMIT),
        routePatternsTruncated: z.boolean(),
        visibility: z.object({
            helpWidget: z.boolean(),
            helpCenter: z.boolean(),
            changelog: z.boolean(),
        }).strict(),
        visibleArticleCount: countSchema(25),
        visibleFaqCount: countSchema(25),
        visibleChangelogCount: countSchema(25),
    }).strict()).max(ANSWERLATTICE_SURFACE_REVIEW_ITEM_LIMIT),
}).strict();

export const AnswerlatticeTruthPropagationProofSchema = z.object({
    state: z.enum(['ready', 'rebuild_required', 'not_enabled', 'missing', 'invalid']),
    proofScope: z.literal('answerlattice_control_plane_only'),
    checkedAt: z.string().datetime({ offset: true }),
    sourceVersionsState: z.enum(['available', 'missing', 'invalid']),
    manifestState: z.enum([
        'missing',
        'invalid',
        'empty',
        'building',
        'ready',
        'stale',
        'failed',
        'superseded',
    ]),
    manifestMatchesCurrentSourceVersions: z.boolean(),
    activeVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
    lastReadyVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
    publicBundleReady: z.boolean(),
    privateBundleReady: z.boolean(),
    channels: z.array(z.object({
        channel: z.enum(['help_center', 'widget', 'public_api', 'mcp']),
        enabled: z.boolean(),
        currentMode: z.enum(['direct_runtime', 'compiled_bundle', 'disabled']),
        currentState: z.enum(['current', 'rebuild_required', 'unverified', 'disabled']),
        afterActivationState: z.enum(['current', 'rebuild_required', 'disabled']),
    }).strict()).length(4),
}).strict().superRefine((proof, context) => {
    const channels = proof.channels.map(channel => channel.channel);
    if (new Set(channels).size !== 4) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['channels'],
            message: 'Propagation proof must contain each delivery channel exactly once.',
        });
    }
});

export const AnswerlatticeSupportTruthChangeControlSchema = z.object({
    contractVersion: z.literal(ANSWERLATTICE_SUPPORT_TRUTH_CHANGE_CONTROL_VERSION),
    generatedAt: z.string().datetime({ offset: true }),
    releaseReview: AnswerlatticeReleaseTruthReviewSchema,
    sourceWatch: AnswerlatticeSourceFreshnessWatchSchema,
    surfaceReview: AnswerlatticeCrossSurfaceReviewSchema,
    propagationProof: AnswerlatticeTruthPropagationProofSchema,
}).strict();

export type AnswerlatticeSupportTruthChangeControl = z.infer<typeof AnswerlatticeSupportTruthChangeControlSchema>;
export type AnswerlatticeReleaseTruthReview = z.infer<typeof AnswerlatticeReleaseTruthReviewSchema>;
export type AnswerlatticeSourceFreshnessWatch = z.infer<typeof AnswerlatticeSourceFreshnessWatchSchema>;
export type AnswerlatticeCrossSurfaceReview = z.infer<typeof AnswerlatticeCrossSurfaceReviewSchema>;
export type AnswerlatticeTruthPropagationProof = z.infer<typeof AnswerlatticeTruthPropagationProofSchema>;

type SourceEvidenceLink = {
    sourceId: string;
    linkedAnswerCount: number;
};

type CheckedSourceRecord = {
    sourceId: string;
    exists: boolean;
    data?: unknown;
};

const buildEmptySourceFreshnessWatch = (input: {
    checkedAt: string;
    evidenceLinks: SourceEvidenceLink[];
    governanceEligibleSourceCount: number;
    invalidEvidenceReferenceCount: number;
    state: 'not_enabled' | 'unavailable';
}): AnswerlatticeSourceFreshnessWatch => AnswerlatticeSourceFreshnessWatchSchema.parse({
    state: input.state,
    mappingScope: 'direct_canonical_evidence_ids',
    checkedAt: input.checkedAt,
    totalEvidenceSourceCount: input.evidenceLinks.length,
    governanceEligibleSourceCount: input.governanceEligibleSourceCount,
    checkedSourceCount: 0,
    approvedCount: 0,
    unreviewedCount: 0,
    nonApprovedCount: 0,
    reviewDateMissingCount: 0,
    reviewDueCount: 0,
    notYetEffectiveCount: 0,
    conflictCount: 0,
    missingCount: 0,
    invalidCount: 0,
    invalidEvidenceReferenceCount: input.invalidEvidenceReferenceCount,
    untrackedSourceCount: input.evidenceLinks.length - input.governanceEligibleSourceCount,
    truncated: false,
    items: [],
});

const SourceFreshnessRecordSchema = z.object({
    pId: z.literal(PRODUCT_IDS.ANSWERLATTICE),
    tId: z.number().int().positive(),
    sId: z.number().int().positive(),
    title: z.string().trim().min(1).max(180),
    status: z.enum(['processing', 'ready', 'needs_text', 'failed']),
    governance: z.object({
        approvalStatus: z.enum(['unreviewed', 'approved', 'excluded', 'superseded']),
        effectiveDate: nullableDateOnlySchema.optional(),
        reviewDate: nullableDateOnlySchema.optional(),
        conflictSourceIds: z.array(documentIdSchema.refine(sourceId => (
            normalizeAnswerlatticeKnowledgeIntakeSourceId(sourceId) === sourceId
        ), 'Invalid Knowledge Intake source ID'))
            .max(ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_SOURCE_GOVERNANCE_CONFLICTS),
    }).passthrough().optional(),
}).passthrough();

export const buildAnswerlatticeReleaseTruthReview = (input: {
    changedEntityIds: string[];
    directActiveAnswerCount: number;
    reviewRequiredCount: number;
    answerTestState: AnswerlatticeReleaseTruthReview['answerTestState'];
    entityIdsWithoutVisibleDirectLinks: string[];
}): AnswerlatticeReleaseTruthReview => AnswerlatticeReleaseTruthReviewSchema.parse({
    state: input.reviewRequiredCount > 0
        || input.entityIdsWithoutVisibleDirectLinks.length > 0
        || ['missing', 'stale', 'review', 'blocked'].includes(input.answerTestState)
        ? 'attention'
        : 'ready',
    mappingScope: 'direct_entity_links_only',
    changedEntityCount: input.changedEntityIds.length,
    directActiveAnswerCount: input.directActiveAnswerCount,
    reviewRequiredCount: input.reviewRequiredCount,
    answerTestState: input.answerTestState,
    entityIdsWithoutVisibleDirectLinks: input.entityIdsWithoutVisibleDirectLinks,
});

export const buildAnswerlatticeSourceFreshnessWatch = (input: {
    checkedAt: string;
    checkedSources: CheckedSourceRecord[];
    evidenceLinks: SourceEvidenceLink[];
    governanceEnabled: boolean;
    invalidEvidenceReferenceCount?: number;
    scope: { tId: number; sId: number };
}): AnswerlatticeSourceFreshnessWatch => {
    const evidenceBySourceId = new Map<string, SourceEvidenceLink>();
    for (const link of input.evidenceLinks) {
        if (!isValidFirestoreDocumentId(link.sourceId)) continue;
        const existing = evidenceBySourceId.get(link.sourceId);
        evidenceBySourceId.set(link.sourceId, {
            sourceId: link.sourceId,
            linkedAnswerCount: Math.min(200, (existing?.linkedAnswerCount || 0) + link.linkedAnswerCount),
        });
    }
    const evidenceLinks = Array.from(evidenceBySourceId.values())
        .sort((left, right) => left.sourceId.localeCompare(right.sourceId));
    const governanceLinks = evidenceLinks.filter(link => (
        normalizeAnswerlatticeKnowledgeIntakeSourceId(link.sourceId) === link.sourceId
    ));
    const untrackedSourceCount = evidenceLinks.length - governanceLinks.length;
    const truncated = governanceLinks.length > ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT;
    const checkedAtDate = input.checkedAt.slice(0, 10);
    const checkedById = new Map(input.checkedSources.map(source => [source.sourceId, source]));

    if (!input.governanceEnabled) {
        return buildEmptySourceFreshnessWatch({
            checkedAt: input.checkedAt,
            evidenceLinks,
            governanceEligibleSourceCount: governanceLinks.length,
            invalidEvidenceReferenceCount: input.invalidEvidenceReferenceCount || 0,
            state: 'not_enabled',
        });
    }

    const items = governanceLinks.slice(0, ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT).map((link) => {
        const checked = checkedById.get(link.sourceId);
        if (!checked?.exists) {
            return {
                sourceId: link.sourceId,
                title: null,
                status: null,
                approvalStatus: null,
                reviewDate: null,
                linkedAnswerCount: link.linkedAnswerCount,
                reasons: ['record_missing'] as Array<z.infer<typeof AnswerlatticeSourceFreshnessReasonSchema>>,
            };
        }
        const parsed = SourceFreshnessRecordSchema.safeParse(checked.data);
        if (!parsed.success
            || parsed.data.tId !== input.scope.tId
            || parsed.data.sId !== input.scope.sId) {
            return {
                sourceId: link.sourceId,
                title: null,
                status: null,
                approvalStatus: null,
                reviewDate: null,
                linkedAnswerCount: link.linkedAnswerCount,
                reasons: ['record_invalid'] as Array<z.infer<typeof AnswerlatticeSourceFreshnessReasonSchema>>,
            };
        }
        const source = parsed.data;
        const governance = source.governance;
        const reasons: Array<z.infer<typeof AnswerlatticeSourceFreshnessReasonSchema>> = [];
        if (source.status !== 'ready') reasons.push('source_not_ready');
        if (!governance) {
            reasons.push('governance_unreviewed');
        } else {
            if (governance.approvalStatus !== ANSWERLATTICE_SOURCE_APPROVAL_STATUS.APPROVED) {
                reasons.push('not_approved');
            }
            if (!governance.reviewDate) reasons.push('review_date_missing');
            else if (governance.reviewDate <= checkedAtDate) reasons.push('review_due');
            if (governance.effectiveDate && governance.effectiveDate > checkedAtDate) {
                reasons.push('not_yet_effective');
            }
            if (governance.conflictSourceIds.length > 0) reasons.push('conflict_recorded');
        }
        return {
            sourceId: link.sourceId,
            title: source.title,
            status: source.status,
            approvalStatus: governance?.approvalStatus || null,
            reviewDate: governance?.reviewDate || null,
            linkedAnswerCount: link.linkedAnswerCount,
            reasons,
        };
    });

    const countReason = (reason: z.infer<typeof AnswerlatticeSourceFreshnessReasonSchema>) => (
        items.filter(item => item.reasons.includes(reason)).length
    );
    const issueCount = items.filter(item => item.reasons.length > 0).length;
    const sortedItems = [...items]
        .sort((left, right) => (right.reasons.length - left.reasons.length) || left.sourceId.localeCompare(right.sourceId))
        .slice(0, ANSWERLATTICE_SOURCE_FRESHNESS_ITEM_LIMIT);
    const state: AnswerlatticeSourceFreshnessWatch['state'] = evidenceLinks.length === 0
        && !input.invalidEvidenceReferenceCount
        ? 'no_linked_sources'
        : truncated
            ? 'partial'
            : issueCount > 0 || untrackedSourceCount > 0 || Boolean(input.invalidEvidenceReferenceCount)
                ? 'attention'
                : 'ready';

    return AnswerlatticeSourceFreshnessWatchSchema.parse({
        state,
        mappingScope: 'direct_canonical_evidence_ids',
        checkedAt: input.checkedAt,
        totalEvidenceSourceCount: evidenceLinks.length,
        governanceEligibleSourceCount: governanceLinks.length,
        checkedSourceCount: items.length,
        approvedCount: items.filter(item => item.approvalStatus === ANSWERLATTICE_SOURCE_APPROVAL_STATUS.APPROVED).length,
        unreviewedCount: countReason('governance_unreviewed'),
        nonApprovedCount: countReason('not_approved'),
        reviewDateMissingCount: countReason('review_date_missing'),
        reviewDueCount: countReason('review_due'),
        notYetEffectiveCount: countReason('not_yet_effective'),
        conflictCount: countReason('conflict_recorded'),
        missingCount: countReason('record_missing'),
        invalidCount: countReason('record_invalid'),
        invalidEvidenceReferenceCount: input.invalidEvidenceReferenceCount || 0,
        untrackedSourceCount,
        truncated,
        items: sortedItems,
    });
};

export const buildAnswerlatticeUnavailableSourceFreshnessWatch = (input: {
    checkedAt: string;
    evidenceLinks: SourceEvidenceLink[];
    invalidEvidenceReferenceCount?: number;
}): AnswerlatticeSourceFreshnessWatch => {
    const evidenceLinks = Array.from(new Map(
        input.evidenceLinks
            .filter(link => isValidFirestoreDocumentId(link.sourceId))
            .map(link => [link.sourceId, link]),
    ).values());
    return buildEmptySourceFreshnessWatch({
        checkedAt: input.checkedAt,
        evidenceLinks,
        governanceEligibleSourceCount: evidenceLinks.filter(link => (
            normalizeAnswerlatticeKnowledgeIntakeSourceId(link.sourceId) === link.sourceId
        )).length,
        invalidEvidenceReferenceCount: input.invalidEvidenceReferenceCount || 0,
        state: 'unavailable',
    });
};

const emptySurfaceReview = (
    state: 'missing' | 'invalid',
    changedEntityIds: string[],
): AnswerlatticeCrossSurfaceReview => AnswerlatticeCrossSurfaceReviewSchema.parse({
    state,
    mappingScope: 'direct_surface_entity_links',
    summaryGeneratedAt: null,
    summarySurfaceCount: 0,
    mappedSurfaceCount: 0,
    sampledSurfaceCount: 0,
    changedEntityIds,
    mappedEntityIds: [],
    entityIdsWithoutDirectSurfaceLinks: changedEntityIds,
    visibleMappedArticleCount: 0,
    visibleMappedFaqCount: 0,
    visibleMappedChangelogCount: 0,
    items: [],
});

export const buildAnswerlatticeCrossSurfaceReview = (input: {
    changedEntityIds: string[];
    documentExists: boolean;
    documentValue: unknown;
    scope: { tId: number; sId: number };
}): AnswerlatticeCrossSurfaceReview => {
    const changedEntityIds = Array.from(new Set(input.changedEntityIds));
    if (!input.documentExists) return emptySurfaceReview('missing', changedEntityIds);
    const summary = normalizeAnswerlatticeSurfaceContentSummary(input.documentValue, input.scope);
    if (!summary) return emptySurfaceReview('invalid', changedEntityIds);
    return buildSurfaceReviewFromSummary(summary, changedEntityIds);
};

const buildSurfaceReviewFromSummary = (
    summary: AnswerlatticeSurfaceContentSummary,
    changedEntityIds: string[],
): AnswerlatticeCrossSurfaceReview => {
    const changed = new Set(changedEntityIds);
    const matchedSurfaces = Object.values(summary.surfaces)
        .filter(surface => (surface.entityIds || []).some(entityId => changed.has(entityId)))
        .sort((left, right) => left.key.localeCompare(right.key));
    const mappedEntityIds = changedEntityIds.filter(entityId => (
        matchedSurfaces.some(surface => (surface.entityIds || []).includes(entityId))
    ));
    const articleIds = new Set<string>();
    const faqIds = new Set<string>();
    const changelogIds = new Set<string>();
    const items = matchedSurfaces.slice(0, ANSWERLATTICE_SURFACE_REVIEW_ITEM_LIMIT).map((surface) => {
        const visibility = {
            helpWidget: surface.visibility?.helpWidget !== false,
            helpCenter: surface.visibility?.helpCenter !== false,
            changelog: surface.visibility?.changelog !== false,
        };
        const helpVisible = visibility.helpWidget || visibility.helpCenter;
        const visibleArticles = helpVisible ? surface.articles : [];
        const visibleFaqs = helpVisible ? (surface.faqs || []) : [];
        const visibleChangelogs = visibility.changelog ? surface.changelogs : [];
        visibleArticles.forEach(article => articleIds.add(article.id));
        visibleFaqs.forEach(faq => faqIds.add(faq.id));
        visibleChangelogs.forEach(changelog => changelogIds.add(changelog.id));
        return {
            key: surface.key,
            label: surface.label,
            matchedEntityIds: changedEntityIds.filter(entityId => (surface.entityIds || []).includes(entityId)),
            routePatternCount: surface.routePatterns.length,
            routePatterns: surface.routePatterns.slice(0, ANSWERLATTICE_SURFACE_ROUTE_SAMPLE_LIMIT),
            routePatternsTruncated: surface.routePatterns.length > ANSWERLATTICE_SURFACE_ROUTE_SAMPLE_LIMIT,
            visibility,
            visibleArticleCount: visibleArticles.length,
            visibleFaqCount: visibleFaqs.length,
            visibleChangelogCount: visibleChangelogs.length,
        };
    });
    for (const surface of matchedSurfaces.slice(ANSWERLATTICE_SURFACE_REVIEW_ITEM_LIMIT)) {
        const helpVisible = surface.visibility?.helpWidget !== false || surface.visibility?.helpCenter !== false;
        if (helpVisible) {
            surface.articles.forEach(article => articleIds.add(article.id));
            (surface.faqs || []).forEach(faq => faqIds.add(faq.id));
        }
        if (surface.visibility?.changelog !== false) {
            surface.changelogs.forEach(changelog => changelogIds.add(changelog.id));
        }
    }
    const generatedAtMillis = getAnswerlatticeProductSurfaceTimestampMillis(summary.generatedAt);
    return AnswerlatticeCrossSurfaceReviewSchema.parse({
        state: matchedSurfaces.length > ANSWERLATTICE_SURFACE_REVIEW_ITEM_LIMIT ? 'partial' : 'available',
        mappingScope: 'direct_surface_entity_links',
        summaryGeneratedAt: generatedAtMillis === null ? null : new Date(generatedAtMillis).toISOString(),
        summarySurfaceCount: summary.surfaceCount,
        mappedSurfaceCount: matchedSurfaces.length,
        sampledSurfaceCount: items.length,
        changedEntityIds,
        mappedEntityIds,
        entityIdsWithoutDirectSurfaceLinks: changedEntityIds.filter(entityId => !mappedEntityIds.includes(entityId)),
        visibleMappedArticleCount: articleIds.size,
        visibleMappedFaqCount: faqIds.size,
        visibleMappedChangelogCount: changelogIds.size,
        items,
    });
};

type PropagationFeatureState = {
    contextBundlesEnabled: boolean;
    helpCenterEnabled: boolean;
    mcpEnabled: boolean;
    publicApiBundleReadsEnabled: boolean;
    publicApiEnabled: boolean;
    widgetBundleBootstrapEnabled: boolean;
    widgetEnabled: boolean;
};

export const buildAnswerlatticeTruthPropagationProof = (input: {
    checkedAt: string;
    features: PropagationFeatureState;
    manifestExists: boolean;
    manifestValue: unknown;
    scope: { tId: number; sId: number };
    sourceVersionsExists: boolean;
    sourceVersionsValue: unknown;
}): AnswerlatticeTruthPropagationProof => {
    const sourceVersions = input.sourceVersionsValue && typeof input.sourceVersionsValue === 'object'
        && !Array.isArray(input.sourceVersionsValue)
        ? input.sourceVersionsValue as Record<string, unknown>
        : null;
    const sourceVersionsValid = input.sourceVersionsExists
        && sourceVersions?.pId === PRODUCT_IDS.ANSWERLATTICE
        && sourceVersions.tId === input.scope.tId
        && sourceVersions.sId === input.scope.sId
        && areAnswerlatticeCompiledSourceVersionsValid(sourceVersions);
    const manifestValid = input.manifestExists
        && isAnswerlatticeContextBundleManifestForScope(
            input.manifestValue,
            input.scope.tId,
            input.scope.sId,
        );
    const manifest = manifestValid ? input.manifestValue as Record<string, any> : null;
    const manifestMatches = Boolean(
        sourceVersionsValid
        && manifest
        && compiledSourceVersionsEqual(sourceVersions, manifest.sourceVersions),
    );
    const publicBundleReady = Boolean(
        manifestMatches
        && manifest?.status === 'ready'
        && getAnswerlatticeBundleRefPath(manifest, 'public:widget-bootstrap.json', input.scope.tId, input.scope.sId)
        && getAnswerlatticeBundleRefPath(manifest, 'public:canonical-lite.json', input.scope.tId, input.scope.sId),
    );
    const privateBundleReady = Boolean(
        manifestMatches
        && manifest?.status === 'ready'
        && getAnswerlatticeBundleRefPath(manifest, 'private:mcp/product-summary.json', input.scope.tId, input.scope.sId)
        && getAnswerlatticeBundleRefPath(manifest, 'private:mcp/canonical-index.json', input.scope.tId, input.scope.sId),
    );
    const compiledPublicState = publicBundleReady ? 'current' as const : 'rebuild_required' as const;
    const compiledPrivateState = privateBundleReady ? 'current' as const : 'rebuild_required' as const;
    const channels: AnswerlatticeTruthPropagationProof['channels'] = [
        {
            channel: 'help_center',
            enabled: input.features.helpCenterEnabled,
            currentMode: input.features.helpCenterEnabled ? 'direct_runtime' : 'disabled',
            currentState: input.features.helpCenterEnabled ? 'current' : 'disabled',
            afterActivationState: input.features.helpCenterEnabled ? 'current' : 'disabled',
        },
        {
            channel: 'widget',
            enabled: input.features.widgetEnabled,
            currentMode: !input.features.widgetEnabled
                ? 'disabled'
                : input.features.contextBundlesEnabled && input.features.widgetBundleBootstrapEnabled
                    ? 'compiled_bundle'
                    : 'direct_runtime',
            currentState: !input.features.widgetEnabled
                ? 'disabled'
                : input.features.contextBundlesEnabled && input.features.widgetBundleBootstrapEnabled
                    ? compiledPublicState
                    : 'current',
            afterActivationState: !input.features.widgetEnabled
                ? 'disabled'
                : input.features.contextBundlesEnabled && input.features.widgetBundleBootstrapEnabled
                    ? 'rebuild_required'
                    : 'current',
        },
        {
            channel: 'public_api',
            enabled: input.features.publicApiEnabled,
            currentMode: !input.features.publicApiEnabled
                ? 'disabled'
                : input.features.contextBundlesEnabled && input.features.publicApiBundleReadsEnabled
                    ? 'compiled_bundle'
                    : 'direct_runtime',
            currentState: !input.features.publicApiEnabled
                ? 'disabled'
                : input.features.contextBundlesEnabled && input.features.publicApiBundleReadsEnabled
                    ? compiledPublicState
                    : 'current',
            afterActivationState: !input.features.publicApiEnabled
                ? 'disabled'
                : input.features.contextBundlesEnabled && input.features.publicApiBundleReadsEnabled
                    ? 'rebuild_required'
                    : 'current',
        },
        {
            channel: 'mcp',
            enabled: input.features.mcpEnabled,
            currentMode: input.features.mcpEnabled ? 'compiled_bundle' : 'disabled',
            currentState: !input.features.mcpEnabled
                ? 'disabled'
                : input.features.contextBundlesEnabled
                    ? compiledPrivateState
                    : 'unverified',
            afterActivationState: !input.features.mcpEnabled ? 'disabled' : 'rebuild_required',
        },
    ];
    const sourceVersionsState: AnswerlatticeTruthPropagationProof['sourceVersionsState'] = !input.sourceVersionsExists
        ? 'missing'
        : sourceVersionsValid ? 'available' : 'invalid';
    const manifestState: AnswerlatticeTruthPropagationProof['manifestState'] = !input.manifestExists
        ? 'missing'
        : !manifestValid ? 'invalid' : manifest!.status;
    const state: AnswerlatticeTruthPropagationProof['state'] = !input.features.contextBundlesEnabled
        ? 'not_enabled'
        : !input.sourceVersionsExists || !input.manifestExists
            ? 'missing'
            : !sourceVersionsValid || !manifestValid
                ? 'invalid'
                : manifestMatches && publicBundleReady && privateBundleReady
                    ? 'ready'
                    : 'rebuild_required';

    return AnswerlatticeTruthPropagationProofSchema.parse({
        state,
        proofScope: 'answerlattice_control_plane_only',
        checkedAt: input.checkedAt,
        sourceVersionsState,
        manifestState,
        manifestMatchesCurrentSourceVersions: manifestMatches,
        activeVersion: manifest
            ? normalizeAnswerlatticeStoredBundleVersion(manifest.activeVersion)
            : null,
        lastReadyVersion: manifest
            ? normalizeAnswerlatticeStoredBundleVersion(manifest.lastReadyVersion)
            : null,
        publicBundleReady,
        privateBundleReady,
        channels,
    });
};
