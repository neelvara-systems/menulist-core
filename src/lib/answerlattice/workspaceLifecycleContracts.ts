import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { z } from 'zod';

export const ANSWERLATTICE_WORKSPACE_LIFECYCLE_GRACE_DAYS = 30;
export const ANSWERLATTICE_WORKSPACE_LIFECYCLE_MAX_BODY_BYTES = 8 * 1024;
export const ANSWERLATTICE_WORKSPACE_ERASURE_BATCH_LIMIT = 200;
export const ANSWERLATTICE_WORKSPACE_ERASURE_QUERY_LIMIT = 201;

export const ANSWERLATTICE_WORKSPACE_LIFECYCLE_STATES = [
    'active',
    'closing',
    'closed',
    'erasing',
    'erased',
] as const;

export type AnswerlatticeWorkspaceLifecycleState =
    typeof ANSWERLATTICE_WORKSPACE_LIFECYCLE_STATES[number];

export type AnswerlatticeWorkspaceScope = {
    tId: number;
    sId: number;
};

export type AnswerlatticeWorkspaceErasureCollectionSpec = {
    collection: string;
    productIdentity: 'dedicated' | 'required';
    scopeFields: readonly ('sId' | 'storeId')[];
};

export const ANSWERLATTICE_WORKSPACE_ERASURE_COLLECTIONS: readonly AnswerlatticeWorkspaceErasureCollectionSpec[] = [
    { collection: DB_COLLECTIONS.ANSWERLATTICE_ENTITIES, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SLUG_INDEX, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_RELEASES, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_CHANGELOG_ENTRY_INDEX, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_ENTITY_CANDIDATES, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_FRICTION_DAILY_STATS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_AI_CAPACITY_RESERVATIONS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_NOTIFICATION_LOGS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_EVENTS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_DELIVERY_LOGS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_RATE_LIMITS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_PREDICTIVE_TRIGGERS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_FAQS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_SUPPORT_BOARD_CARDS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_INTAKE_REVIEW_ITEMS, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_INTAKE_USAGE_LEDGER, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.PLATFORM_SUMMARY, productIdentity: 'dedicated', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.OWNER_NOTIFICATION_EVENTS, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.OWNER_NOTIFICATION_DELIVERIES, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.OWNER_NOTIFICATION_RATE_LIMITS, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.AI_SEARCH_HISTORY, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.QUERY_EMBEDDINGS, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.CHAT_SESSIONS, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.CHAT_ANALYTICS, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.SUPPORT_TICKETS, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.FEEDBACK, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.KB_CATEGORIES, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.KB_ARTICLES, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.KB_GENERATION_JOBS, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.KB_STAGING_SECTIONS, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.KB_STAGING_CHUNKS, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.KB_REVIEW_TASKS, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.KB_AI_RUNS, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.KB_SECTIONS, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.CHANGELOG_FEEDBACK, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.ARTICLE_FEEDBACK, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
    { collection: DB_COLLECTIONS.FAQ_FEEDBACK, productIdentity: 'required', scopeFields: ['sId', 'storeId'] },
] as const;

export const ANSWERLATTICE_WORKSPACE_RETAINED_COLLECTIONS = [
    DB_COLLECTIONS.SUBSCRIPTIONS,
    DB_COLLECTIONS.PAYMENT_TRANSACTIONS,
    DB_COLLECTIONS.ANSWERLATTICE_SCHEDULER_RUN_LOGS,
] as const;

const positiveScopeIdSchema = z.coerce.number().int().positive().safe();
const nonEmptyReasonSchema = z.string().trim().min(8).max(500);

export const answerlatticeWorkspaceScopeSchema = z.object({
    tId: positiveScopeIdSchema,
    sId: positiveScopeIdSchema,
}).strict();

export type AnswerlatticeWorkspaceLifecycleRequest =
    | (AnswerlatticeWorkspaceScope & {
        action: 'close';
        confirmation: string;
        reason: string;
    })
    | (AnswerlatticeWorkspaceScope & {
        action: 'recover';
        confirmation: string;
        reason: string;
    })
    | (AnswerlatticeWorkspaceScope & {
        action: 'set_legal_hold';
        enabled: boolean;
        reason: string;
    })
    | (AnswerlatticeWorkspaceScope & {
        action: 'start_erasure';
        billingReview: 'resolved';
        confirmation: string;
        exportDecision: 'completed' | 'waived';
        reason: string;
        retainedEvidenceAcknowledged: true;
    })
    | (AnswerlatticeWorkspaceScope & {
        action: 'continue_erasure';
        confirmation: string;
    });

export const answerlatticeWorkspaceLifecycleRequestSchema = z.discriminatedUnion('action', [
    answerlatticeWorkspaceScopeSchema.extend({
        action: z.literal('close'),
        confirmation: z.string().max(100),
        reason: nonEmptyReasonSchema,
    }).strict(),
    answerlatticeWorkspaceScopeSchema.extend({
        action: z.literal('recover'),
        confirmation: z.string().max(100),
        reason: nonEmptyReasonSchema,
    }).strict(),
    answerlatticeWorkspaceScopeSchema.extend({
        action: z.literal('set_legal_hold'),
        enabled: z.boolean(),
        reason: nonEmptyReasonSchema,
    }).strict(),
    answerlatticeWorkspaceScopeSchema.extend({
        action: z.literal('start_erasure'),
        billingReview: z.literal('resolved'),
        confirmation: z.string().max(100),
        exportDecision: z.enum(['completed', 'waived']),
        reason: nonEmptyReasonSchema,
        retainedEvidenceAcknowledged: z.literal(true),
    }).strict(),
    answerlatticeWorkspaceScopeSchema.extend({
        action: z.literal('continue_erasure'),
        confirmation: z.string().max(100),
    }).strict(),
]) as z.ZodType<AnswerlatticeWorkspaceLifecycleRequest>;

const normalizeScopeId = (value: unknown): number | null => {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value > 0 ? value : null;
    }
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
    const normalized = Number(value);
    return Number.isSafeInteger(normalized) ? normalized : null;
};

const getRecord = (value: unknown): Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {}
);

const hasExactScopeAxis = (
    data: Record<string, unknown>,
    fields: readonly string[],
    expected: number,
): boolean => {
    const supplied = fields
        .filter((field) => data[field] !== undefined)
        .map((field) => normalizeScopeId(data[field]));
    return supplied.length > 0 && supplied.every((value) => value === expected);
};

export const hasExactAnswerlatticeProductIdentity = (value: unknown): boolean => {
    const data = getRecord(value);
    const supplied = [data.pId, data.productId].filter((entry) => entry !== undefined);
    return supplied.length > 0 && supplied.every((entry) => entry === PRODUCT_IDS.ANSWERLATTICE);
};

export const hasExactAnswerlatticeWorkspaceScope = (
    value: unknown,
    scope: AnswerlatticeWorkspaceScope,
): boolean => {
    const data = getRecord(value);
    return hasExactScopeAxis(data, ['tId', 'tenantId'], scope.tId)
        && hasExactScopeAxis(data, ['sId', 'storeId'], scope.sId);
};

export const isAnswerlatticeWorkspaceBillingActivationAllowed = (
    value: unknown,
): boolean => {
    const data = getRecord(value);
    if (data.active === false || data.deleted === true || data.authDisabled === true) return false;
    if (data.answerlatticeWorkspaceLifecycle === undefined) return true;
    const lifecycle = getRecord(data.answerlatticeWorkspaceLifecycle);
    return lifecycle.state === 'active';
};

export type AnswerlatticeWorkspaceRecordClassification =
    | 'exact'
    | 'foreign'
    | 'ambiguous';

export const classifyAnswerlatticeWorkspaceRecord = (
    value: unknown,
    scope: AnswerlatticeWorkspaceScope,
    productIdentity: AnswerlatticeWorkspaceErasureCollectionSpec['productIdentity'],
): AnswerlatticeWorkspaceRecordClassification => {
    const data = getRecord(value);
    if (!hasExactAnswerlatticeWorkspaceScope(data, scope)) {
        const hasAnyScope = ['tId', 'tenantId', 'sId', 'storeId'].some((field) => data[field] !== undefined);
        return hasAnyScope ? 'foreign' : 'ambiguous';
    }
    if (productIdentity === 'required' && !hasExactAnswerlatticeProductIdentity(data)) {
        return 'ambiguous';
    }
    if (
        productIdentity === 'dedicated'
        && [data.pId, data.productId]
            .filter((entry) => entry !== undefined)
            .some((entry) => entry !== PRODUCT_IDS.ANSWERLATTICE)
    ) {
        return 'foreign';
    }
    return 'exact';
};

export const getAnswerlatticeWorkspaceCloseConfirmation = (
    scope: AnswerlatticeWorkspaceScope,
): string => `AL:${scope.tId}:${scope.sId}:CLOSE`;

export const getAnswerlatticeWorkspaceRecoverConfirmation = (
    scope: AnswerlatticeWorkspaceScope,
): string => `AL:${scope.tId}:${scope.sId}:RECOVER`;

export const getAnswerlatticeWorkspaceEraseConfirmation = (
    scope: AnswerlatticeWorkspaceScope,
): string => `AL:${scope.tId}:${scope.sId}:ERASE`;

export const isExactAnswerlatticeWorkspaceConfirmation = (
    value: unknown,
    expected: string,
): boolean => typeof value === 'string' && value === expected;

export const getAnswerlatticeWorkspaceEraseAfterMillis = (
    closedAtMillis: number,
): number => closedAtMillis
    + ANSWERLATTICE_WORKSPACE_LIFECYCLE_GRACE_DAYS * 24 * 60 * 60 * 1000;

export const canRecoverAnswerlatticeWorkspace = (params: {
    eraseAfterMillis: number;
    nowMillis: number;
    state: AnswerlatticeWorkspaceLifecycleState;
}): boolean => (
    params.state === 'closed'
    && Number.isFinite(params.eraseAfterMillis)
    && params.nowMillis < params.eraseAfterMillis
);

export const canStartAnswerlatticeWorkspaceErasure = (params: {
    activeSubscription: boolean;
    billingReview: unknown;
    eraseAfterMillis: number;
    exportDecision: unknown;
    legalHold: boolean;
    nowMillis: number;
    retainedEvidenceAcknowledged: boolean;
    state: AnswerlatticeWorkspaceLifecycleState;
}): { allowed: boolean; reason?: string } => {
    if (params.state !== 'closed') return { allowed: false, reason: 'WORKSPACE_NOT_CLOSED' };
    if (params.legalHold) return { allowed: false, reason: 'LEGAL_HOLD_ACTIVE' };
    if (params.nowMillis < params.eraseAfterMillis) return { allowed: false, reason: 'RECOVERY_WINDOW_ACTIVE' };
    if (params.activeSubscription) return { allowed: false, reason: 'ACTIVE_SUBSCRIPTION' };
    if (params.billingReview !== 'resolved') return { allowed: false, reason: 'BILLING_REVIEW_REQUIRED' };
    if (params.exportDecision !== 'completed' && params.exportDecision !== 'waived') {
        return { allowed: false, reason: 'EXPORT_DECISION_REQUIRED' };
    }
    if (!params.retainedEvidenceAcknowledged) {
        return { allowed: false, reason: 'RETAINED_EVIDENCE_ACKNOWLEDGEMENT_REQUIRED' };
    }
    return { allowed: true };
};
