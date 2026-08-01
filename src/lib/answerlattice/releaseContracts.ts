import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { PRODUCT_IDS } from '@constant/product';
import { z } from 'zod';

export const ANSWERLATTICE_RELEASE_MAX_ENTITY_CHANGES = 25;
export const ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS = 200;
export const ANSWERLATTICE_RELEASE_ACTIVATION_LEASE_MS = 5 * 60 * 1000;

const strictDocumentId = (label: string) => z.string()
    .trim()
    .min(1, `${label} is required`)
    .max(180, `${label} is too long`)
    .refine(isValidFirestoreDocumentId, `${label} is invalid`);

const requestIdSchema = z.string()
    .trim()
    .min(8)
    .max(180)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const impactFingerprintSchema = z.string().regex(/^[a-f0-9]{64}$/);
const actionScopeSchema = z.object({
    tId: z.number().int().positive(),
    sId: z.number().int().positive(),
}).strict();

const entityChangesSchema = z.array(strictDocumentId('Entity ID'))
    .min(1)
    .max(ANSWERLATTICE_RELEASE_MAX_ENTITY_CHANGES)
    .superRefine((values, context) => {
        if (new Set(values).size !== values.length) {
            context.addIssue({ code: z.ZodIssueCode.custom, message: 'Changed entities must be unique' });
        }
    });

export function normalizeAnswerlatticeVersionLabel(
    value: unknown,
): { label: string; normalized: number } | null {
    if (typeof value !== 'string') return null;
    const label = value.trim().replace(/^v/i, '');
    if (!/^\d{1,6}(?:\.\d{1,3}){0,2}$/.test(label)) return null;
    const parts = label.split('.').map(Number);
    if (parts.some((part) => !Number.isSafeInteger(part) || part < 0 || part > 999_999)) return null;
    const [major, minor = 0, patch = 0] = parts;
    if (major <= 0 || minor > 999 || patch > 999) return null;
    const normalized = major * 1_000_000 + minor * 1_000 + patch;
    return Number.isSafeInteger(normalized) ? { label, normalized } : null;
}

const addVersionConsistencyIssue = (
    value: { versionLabel?: unknown; versionNormalized?: unknown },
    context: z.RefinementCtx,
): void => {
    const normalized = normalizeAnswerlatticeVersionLabel(value.versionLabel);
    if (!normalized
        || value.versionLabel !== normalized.label
        || value.versionNormalized !== normalized.normalized) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['versionNormalized'],
            message: 'Release version label and normalized version must match',
        });
    }
};

export const AnswerlatticeCreateReleaseActionSchema = z.object({
    action: z.literal('create'),
    requestId: requestIdSchema,
    scope: actionScopeSchema,
    versionLabel: z.string().trim().min(1).max(64),
    versionNormalized: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    releasedAt: z.string().datetime({ offset: true }),
    entityChanges: entityChangesSchema,
}).strict();

export const AnswerlatticeActivateReleaseActionSchema = z.object({
    action: z.literal('activate'),
    requestId: requestIdSchema,
    scope: actionScopeSchema,
    releaseId: strictDocumentId('Release ID'),
    impactFingerprint: impactFingerprintSchema,
}).strict();

export const AnswerlatticePreviewReleaseImpactActionSchema = z.object({
    action: z.literal('preview_impact'),
    requestId: requestIdSchema,
    scope: actionScopeSchema,
    releaseId: strictDocumentId('Release ID'),
    includeAnswerTestProof: z.boolean(),
}).strict();

export const AnswerlatticeReleaseActionSchema = z.discriminatedUnion('action', [
    AnswerlatticeCreateReleaseActionSchema,
    AnswerlatticePreviewReleaseImpactActionSchema,
    AnswerlatticeActivateReleaseActionSchema,
]).superRefine((value, context) => {
    if (value.action === 'create') {
        addVersionConsistencyIssue(value, context);
    }
});

export type AnswerlatticeCreateReleaseAction = {
    action: 'create';
    requestId: string;
    scope: z.infer<typeof actionScopeSchema>;
    versionLabel: string;
    versionNormalized: number;
    releasedAt: string;
    entityChanges: string[];
};

export type AnswerlatticeActivateReleaseAction = {
    action: 'activate';
    requestId: string;
    scope: z.infer<typeof actionScopeSchema>;
    releaseId: string;
    impactFingerprint: string;
};

export type AnswerlatticePreviewReleaseImpactAction = {
    action: 'preview_impact';
    requestId: string;
    scope: z.infer<typeof actionScopeSchema>;
    releaseId: string;
    includeAnswerTestProof: boolean;
};

export type AnswerlatticeReleaseAction =
    | AnswerlatticeCreateReleaseAction
    | AnswerlatticePreviewReleaseImpactAction
    | AnswerlatticeActivateReleaseAction;

export const parseAnswerlatticeReleaseAction = (value: unknown): AnswerlatticeReleaseAction | null => {
    const parsed = AnswerlatticeReleaseActionSchema.safeParse(value);
    if (!parsed.success) return null;
    const data = parsed.data;
    if (data.action === 'create'
        && typeof data.requestId === 'string'
        && typeof data.versionLabel === 'string'
        && typeof data.versionNormalized === 'number'
        && typeof data.releasedAt === 'string'
        && Array.isArray(data.entityChanges)) {
        return {
            action: 'create',
            requestId: data.requestId,
            scope: data.scope,
            versionLabel: data.versionLabel,
            versionNormalized: data.versionNormalized,
            releasedAt: data.releasedAt,
            entityChanges: data.entityChanges,
        };
    }
    if (data.action === 'activate'
        && typeof data.requestId === 'string'
        && typeof data.releaseId === 'string'
        && typeof data.impactFingerprint === 'string') {
        return {
            action: 'activate',
            requestId: data.requestId,
            scope: data.scope,
            releaseId: data.releaseId,
            impactFingerprint: data.impactFingerprint,
        };
    }
    if (data.action === 'preview_impact'
        && typeof data.requestId === 'string'
        && typeof data.releaseId === 'string'
        && typeof data.includeAnswerTestProof === 'boolean') {
        return {
            action: 'preview_impact',
            requestId: data.requestId,
            scope: data.scope,
            releaseId: data.releaseId,
            includeAnswerTestProof: data.includeAnswerTestProof,
        };
    }
    return null;
};

const releaseStatusSchema = z.enum(['pending', 'processing', 'active']);

const timestampLikeSchema = z.custom<{ toMillis(): number }>((value) => {
    if (!value || typeof value !== 'object' || typeof (value as { toMillis?: unknown }).toMillis !== 'function') {
        return false;
    }
    try {
        return Number.isFinite((value as { toMillis(): number }).toMillis());
    } catch {
        return false;
    }
}, 'Expected a Firestore timestamp');

export const AnswerlatticeStoredReleaseSchema = z.object({
    pId: z.literal(PRODUCT_IDS.ANSWERLATTICE),
    tId: z.number().int().positive(),
    sId: z.number().int().positive(),
    versionLabel: z.string().trim().min(1).max(64),
    versionNormalized: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    releasedAt: timestampLikeSchema,
    entityChanges: entityChangesSchema,
    status: releaseStatusSchema,
    requestId: requestIdSchema.optional(),
    requestFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    activation: z.object({
        requestId: requestIdSchema,
        impactFingerprint: impactFingerprintSchema,
        startedAt: timestampLikeSchema,
        leaseExpiresAt: timestampLikeSchema,
    }).strict().optional(),
    impactFingerprint: impactFingerprintSchema.optional(),
    driftEvaluation: z.object({
        status: z.enum(['completed', 'failed']),
        evaluatedAnswers: z.number().int().nonnegative().max(ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS),
        driftedAnswers: z.number().int().nonnegative().max(ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS),
        completedAt: timestampLikeSchema.optional(),
        failedAt: timestampLikeSchema.optional(),
        failureCode: z.string().trim().min(1).max(80).optional(),
    }).strict().optional(),
    activatedAt: timestampLikeSchema.optional(),
    createdOn: timestampLikeSchema,
    createdBy: z.string().trim().min(1).max(200),
    modifiedOn: timestampLikeSchema,
    modifiedBy: z.string().trim().min(1).max(200),
}).passthrough().superRefine(addVersionConsistencyIssue);

const releaseDependencyEntityIdsSchema = z.array(strictDocumentId('Entity ID'))
    .max(ANSWERLATTICE_RELEASE_MAX_ENTITY_CHANGES);

export const AnswerlatticeReleaseDirectDependencyCoverageSchema = z.object({
    mappingScope: z.literal('direct_entity_links_only'),
    changedEntityIds: releaseDependencyEntityIdsSchema,
    answerLinkedEntityIds: releaseDependencyEntityIdsSchema,
    testLinkedEntityIds: releaseDependencyEntityIdsSchema,
    entityIdsWithoutVisibleDirectLinks: releaseDependencyEntityIdsSchema,
    directActiveAnswerCount: z.number().int().nonnegative().max(ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS),
    activeLinkedTestCount: z.number().int().nonnegative().max(100),
    testLinkEvidence: z.enum(['available', 'permission_required', 'not_requested']),
}).strict().superRefine((coverage, context) => {
    const changed = new Set(coverage.changedEntityIds);
    const answerLinked = new Set(coverage.answerLinkedEntityIds);
    const testLinked = new Set(coverage.testLinkedEntityIds);
    const collections = [
        ['changedEntityIds', coverage.changedEntityIds],
        ['answerLinkedEntityIds', coverage.answerLinkedEntityIds],
        ['testLinkedEntityIds', coverage.testLinkedEntityIds],
        ['entityIdsWithoutVisibleDirectLinks', coverage.entityIdsWithoutVisibleDirectLinks],
    ] as const;
    for (const [key, values] of collections) {
        if (new Set(values).size !== values.length) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Release dependency entity IDs must be unique.',
                path: [key],
            });
        }
    }
    for (const entityId of Array.from(answerLinked)
        .concat(Array.from(testLinked), coverage.entityIdsWithoutVisibleDirectLinks)) {
        if (!changed.has(entityId)) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Release dependency links must belong to a changed entity.',
            });
            break;
        }
    }
    const expectedWithoutLinks = coverage.changedEntityIds.filter(entityId => (
        !answerLinked.has(entityId) && !testLinked.has(entityId)
    ));
    if (
        expectedWithoutLinks.length !== coverage.entityIdsWithoutVisibleDirectLinks.length
        || expectedWithoutLinks.some((entityId, index) => entityId !== coverage.entityIdsWithoutVisibleDirectLinks[index])
    ) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Entities without visible direct links must match the changed-entity evidence.',
            path: ['entityIdsWithoutVisibleDirectLinks'],
        });
    }
    if (coverage.testLinkEvidence !== 'available'
        && (coverage.testLinkedEntityIds.length > 0 || coverage.activeLinkedTestCount > 0)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Unavailable test-link evidence cannot report linked tests.',
            path: ['testLinkEvidence'],
        });
    }
    if ((coverage.directActiveAnswerCount === 0) !== (coverage.answerLinkedEntityIds.length === 0)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Direct answer count and linked changed entities must agree.',
            path: ['directActiveAnswerCount'],
        });
    }
    if (coverage.testLinkEvidence === 'available'
        && ((coverage.activeLinkedTestCount === 0) !== (coverage.testLinkedEntityIds.length === 0))) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Direct Answer Test count and linked changed entities must agree.',
            path: ['activeLinkedTestCount'],
        });
    }
});

export type AnswerlatticeReleaseDirectDependencyCoverage = z.infer<
    typeof AnswerlatticeReleaseDirectDependencyCoverageSchema
>;

export const buildAnswerlatticeReleaseDirectDependencyCoverage = (input: {
    activeLinkedTestCount: number;
    answerEntityIds: string[];
    changedEntityIds: string[];
    directActiveAnswerCount: number;
    testEntityIds: string[];
    testLinkEvidence: AnswerlatticeReleaseDirectDependencyCoverage['testLinkEvidence'];
}): AnswerlatticeReleaseDirectDependencyCoverage => {
    const changedEntityIds = Array.from(new Set(input.changedEntityIds));
    const changed = new Set(changedEntityIds);
    const answerLinkedEntityIds = Array.from(new Set(input.answerEntityIds))
        .filter(entityId => changed.has(entityId));
    const testLinkedEntityIds = input.testLinkEvidence === 'available'
        ? Array.from(new Set(input.testEntityIds)).filter(entityId => changed.has(entityId))
        : [];
    const linked = new Set([...answerLinkedEntityIds, ...testLinkedEntityIds]);
    return AnswerlatticeReleaseDirectDependencyCoverageSchema.parse({
        mappingScope: 'direct_entity_links_only',
        changedEntityIds,
        answerLinkedEntityIds,
        testLinkedEntityIds,
        entityIdsWithoutVisibleDirectLinks: changedEntityIds.filter(entityId => !linked.has(entityId)),
        directActiveAnswerCount: input.directActiveAnswerCount,
        activeLinkedTestCount: input.testLinkEvidence === 'available' ? input.activeLinkedTestCount : 0,
        testLinkEvidence: input.testLinkEvidence,
    });
};

const answerlatticeReleasePersistenceResultSchema = z.discriminatedUnion('action', [
    z.object({
        success: z.literal(true),
        action: z.literal('create'),
        releaseId: strictDocumentId('Release ID'),
        status: releaseStatusSchema,
        replayed: z.boolean(),
    }).strict(),
    z.object({
        success: z.literal(true),
        action: z.literal('preview_impact'),
        releaseId: strictDocumentId('Release ID'),
        status: z.literal('pending'),
        impactFingerprint: impactFingerprintSchema,
        affectedAnswerCount: z.number().int().nonnegative().max(ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS),
        reviewRequiredCount: z.number().int().nonnegative().max(ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS),
        affectedAnswers: z.array(z.object({
            answerId: strictDocumentId('Answer ID'),
            title: z.string().trim().min(1).max(180).nullable(),
            lastValidatedInVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
            currentDriftFlag: z.boolean(),
            currentReviewRequired: z.boolean(),
            willRequireReview: z.boolean(),
            matchReason: z.literal('direct_entity_binding'),
            matchedEntityCount: z.number().int().positive().max(ANSWERLATTICE_RELEASE_MAX_ENTITY_CHANGES),
        }).strict()).max(ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS),
        answerTestProof: z.object({
            state: z.enum([
                'not_requested',
                'permission_required',
                'no_linked_tests',
                'missing',
                'stale',
                'ready',
                'review',
                'blocked',
            ]),
            linkedCaseCount: z.number().int().nonnegative().max(100),
            criticalCaseCount: z.number().int().nonnegative().max(100),
            failedCaseCount: z.number().int().nonnegative().max(100),
            criticalFailureCount: z.number().int().nonnegative().max(100),
            lastRunAt: z.string().datetime({ offset: true }).nullable(),
        }).strict(),
        directDependencyCoverage: AnswerlatticeReleaseDirectDependencyCoverageSchema,
    }).strict(),
    z.object({
        success: z.literal(true),
        action: z.literal('activate'),
        releaseId: strictDocumentId('Release ID'),
        status: z.literal('active'),
        evaluatedAnswers: z.number().int().nonnegative(),
        driftedAnswers: z.number().int().nonnegative(),
        replayed: z.boolean(),
    }).strict(),
]).superRefine((result, context) => {
    if (result.action !== 'preview_impact') return;
    if (result.affectedAnswers.length !== result.affectedAnswerCount) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Affected answer count must match the projected answers.',
            path: ['affectedAnswerCount'],
        });
    }
    const reviewRequiredCount = result.affectedAnswers.filter(answer => answer.willRequireReview).length;
    if (reviewRequiredCount !== result.reviewRequiredCount) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Review-required count must match the projected answers.',
            path: ['reviewRequiredCount'],
        });
    }
    if (result.directDependencyCoverage.directActiveAnswerCount !== result.affectedAnswerCount) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Direct answer dependency count must match the affected-answer projection.',
            path: ['directDependencyCoverage', 'directActiveAnswerCount'],
        });
    }
    const testEvidenceAvailable = ![
        'not_requested',
        'permission_required',
    ].includes(result.answerTestProof.state);
    if (
        (testEvidenceAvailable
            ? result.directDependencyCoverage.testLinkEvidence !== 'available'
                || result.directDependencyCoverage.activeLinkedTestCount !== result.answerTestProof.linkedCaseCount
            : result.directDependencyCoverage.testLinkEvidence
                !== (result.answerTestProof.state === 'permission_required' ? 'permission_required' : 'not_requested'))
    ) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Direct test dependency evidence must match the Answer Test proof.',
            path: ['directDependencyCoverage', 'testLinkEvidence'],
        });
    }
});

export const AnswerlatticeReleaseActionResultSchema = z.discriminatedUnion('action', [
    z.object({
        success: z.literal(true),
        action: z.literal('create'),
        releaseId: strictDocumentId('Release ID'),
        status: releaseStatusSchema,
        replayed: z.boolean(),
        scope: actionScopeSchema,
    }).strict(),
    z.object({
        success: z.literal(true),
        action: z.literal('preview_impact'),
        releaseId: strictDocumentId('Release ID'),
        status: z.literal('pending'),
        impactFingerprint: impactFingerprintSchema,
        affectedAnswerCount: z.number().int().nonnegative().max(ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS),
        reviewRequiredCount: z.number().int().nonnegative().max(ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS),
        affectedAnswers: z.array(z.object({
            answerId: strictDocumentId('Answer ID'),
            title: z.string().trim().min(1).max(180).nullable(),
            lastValidatedInVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
            currentDriftFlag: z.boolean(),
            currentReviewRequired: z.boolean(),
            willRequireReview: z.boolean(),
            matchReason: z.literal('direct_entity_binding'),
            matchedEntityCount: z.number().int().positive().max(ANSWERLATTICE_RELEASE_MAX_ENTITY_CHANGES),
        }).strict()).max(ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS),
        answerTestProof: z.object({
            state: z.enum([
                'not_requested',
                'permission_required',
                'no_linked_tests',
                'missing',
                'stale',
                'ready',
                'review',
                'blocked',
            ]),
            linkedCaseCount: z.number().int().nonnegative().max(100),
            criticalCaseCount: z.number().int().nonnegative().max(100),
            failedCaseCount: z.number().int().nonnegative().max(100),
            criticalFailureCount: z.number().int().nonnegative().max(100),
            lastRunAt: z.string().datetime({ offset: true }).nullable(),
        }).strict(),
        directDependencyCoverage: AnswerlatticeReleaseDirectDependencyCoverageSchema,
        scope: actionScopeSchema,
    }).strict(),
    z.object({
        success: z.literal(true),
        action: z.literal('activate'),
        releaseId: strictDocumentId('Release ID'),
        status: z.literal('active'),
        evaluatedAnswers: z.number().int().nonnegative(),
        driftedAnswers: z.number().int().nonnegative(),
        replayed: z.boolean(),
        scope: actionScopeSchema,
    }).strict(),
]).superRefine((result, context) => {
    if (result.action !== 'preview_impact') return;
    if (result.affectedAnswers.length !== result.affectedAnswerCount) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Affected answer count must match the projected answers.',
            path: ['affectedAnswerCount'],
        });
    }
    const reviewRequiredCount = result.affectedAnswers.filter(answer => answer.willRequireReview).length;
    if (reviewRequiredCount !== result.reviewRequiredCount) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Review-required count must match the projected answers.',
            path: ['reviewRequiredCount'],
        });
    }
    if (result.directDependencyCoverage.directActiveAnswerCount !== result.affectedAnswerCount) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Direct answer dependency count must match the affected-answer projection.',
            path: ['directDependencyCoverage', 'directActiveAnswerCount'],
        });
    }
    const testEvidenceAvailable = ![
        'not_requested',
        'permission_required',
    ].includes(result.answerTestProof.state);
    if (
        (testEvidenceAvailable
            ? result.directDependencyCoverage.testLinkEvidence !== 'available'
                || result.directDependencyCoverage.activeLinkedTestCount !== result.answerTestProof.linkedCaseCount
            : result.directDependencyCoverage.testLinkEvidence
                !== (result.answerTestProof.state === 'permission_required' ? 'permission_required' : 'not_requested'))
    ) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Direct test dependency evidence must match the Answer Test proof.',
            path: ['directDependencyCoverage', 'testLinkEvidence'],
        });
    }
});

export type AnswerlatticeReleaseActionResult = z.infer<typeof answerlatticeReleasePersistenceResultSchema>;
export type AnswerlatticeReleaseActionResponse = z.infer<typeof AnswerlatticeReleaseActionResultSchema>;

export const getAnswerlatticeTimestampMillis = (value: unknown): number => {
    if (!value || typeof value !== 'object' || typeof (value as { toMillis?: unknown }).toMillis !== 'function') return 0;
    try {
        const millis = Number((value as { toMillis(): number }).toMillis());
        return Number.isFinite(millis) ? millis : 0;
    } catch {
        return 0;
    }
};
