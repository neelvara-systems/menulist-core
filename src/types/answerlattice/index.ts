/**
 * Answerlattice — Governed Answer Infrastructure
 * 
 * Type definitions for the 5-pillar architecture:
 * 1. Product Ontology (entities, relations)
 * 2. Canonical Answer Engine (governed answers)
 * 3. Drift Governance (4 drift classes)
 * 4. Signal Mutation (mutation proposals)
 * 5. API & Integration (releases, audit)
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
 * 
 * FREEZE RULE: Core schemas are frozen for 3 years.
 * Only additive fields allowed. No breaking changes.
 * @see __docs__/answerlattice/doctrine/03-infrastructure-freeze-v1.md
 */

import { Timestamp } from "firebase/firestore";
import type { ProductId } from "@constant/product";
import type { SourceContext } from "@type/multiProduct";

export interface AnswerlatticeDocumentIdentity {
    pId?: ProductId;
    sourceContext?: SourceContext;
    traceId?: string;
    requestId?: string;
}

// ═══════════════════════════════════════════════════════════════
// PILLAR 1 — PRODUCT ONTOLOGY
// ═══════════════════════════════════════════════════════════════

export const ANSWERLATTICE_ENTITY_TYPES = {
    FEATURE: 'feature',
    PLAN: 'plan',
    ROLE: 'role',
    WORKFLOW: 'workflow',
    STATE: 'state',
    INTEGRATION: 'integration',
    ERROR: 'error',
} as const;

export type AnswerlatticeEntityType = typeof ANSWERLATTICE_ENTITY_TYPES[keyof typeof ANSWERLATTICE_ENTITY_TYPES];

export const ANSWERLATTICE_ENTITY_STATUS = {
    ACTIVE: 'active',
    DEPRECATED: 'deprecated',
    BETA: 'beta',
} as const;

export type AnswerlatticeEntityStatus = typeof ANSWERLATTICE_ENTITY_STATUS[keyof typeof ANSWERLATTICE_ENTITY_STATUS];

export interface AnswerlatticeEntity extends AnswerlatticeDocumentIdentity {
    id: string;
    tId: number;
    sId: number;

    type: AnswerlatticeEntityType;
    name: string;
    slug: string;
    description: string;

    status: AnswerlatticeEntityStatus;

    aliases?: string[];   // Lowercase alias phrases that resolve to this entity (max 20)

    currentVersion: number; // Normalized integer (e.g., 002004001 for 2.4.1)

    // Auto-injected by requestBodyComposer
    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    createdBy?: string;
    modifiedBy?: string;
    uId?: string | number;
}

export const ANSWERLATTICE_RELATION_TYPES = {
    AVAILABLE_IN: 'available_in',
    RESTRICTED_BY: 'restricted_by',
    REQUIRES: 'requires',
    PART_OF: 'part_of',
    TRANSITIONS_TO: 'transitions_to',
    TRIGGERS: 'triggers',
} as const;

export type AnswerlatticeRelationType = typeof ANSWERLATTICE_RELATION_TYPES[keyof typeof ANSWERLATTICE_RELATION_TYPES];

export interface AnswerlatticeEntityRelation extends AnswerlatticeDocumentIdentity {
    id: string;
    tId: number;
    sId: number;

    fromEntityId: string;
    toEntityId: string;
    relationType: AnswerlatticeRelationType;

    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// PILLAR 2 — CANONICAL ANSWER ENGINE
// ═══════════════════════════════════════════════════════════════

export const ANSWERLATTICE_ANSWER_STATUS = {
    ACTIVE: 'active',
    NEEDS_REVIEW: 'needs_review',
    DEPRECATED: 'deprecated',
    ARCHIVED: 'archived',
} as const;

export type AnswerlatticeAnswerStatus = typeof ANSWERLATTICE_ANSWER_STATUS[keyof typeof ANSWERLATTICE_ANSWER_STATUS];

export const ANSWERLATTICE_VALIDATION_SOURCE = {
    MANUAL: 'manual',
    SIGNAL_CLUSTER: 'signal_cluster',
    RELEASE_REVIEW: 'release_review',
} as const;

export type AnswerlatticeValidationSource = typeof ANSWERLATTICE_VALIDATION_SOURCE[keyof typeof ANSWERLATTICE_VALIDATION_SOURCE];

export const ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS = {
    MAX_SOURCE_IDS: 20,
    MAX_PUBLIC_CITATIONS: 8,
    MAX_CITATION_TITLE_LENGTH: 240,
    MAX_CITATION_URL_LENGTH: 500,
} as const;

export interface AnswerlatticeCanonicalCitation {
    id: string;
    title: string;
    url: string;
    sourceId?: string;
}

export type AnswerlatticePublicCitation = Omit<AnswerlatticeCanonicalCitation, 'sourceId'>;

export interface AnswerlatticeScopeClarification {
    type: 'scope_context';
    requiredContext: Array<'plan' | 'role' | 'state'>;
}

export interface AnswerlatticeCanonicalEvidence {
    /** Internal workspace evidence pointers. These are never exposed to public answer surfaces. */
    sourceIds: string[];
    /** Reviewer-approved public links that may be shown with customer-facing answers. */
    citations: AnswerlatticeCanonicalCitation[];
}

export interface AnswerlatticeCanonicalAnswer extends AnswerlatticeDocumentIdentity {
    id: string;
    tId: number;
    sId: number;

    title: string;
    slug: string;

    status: AnswerlatticeAnswerStatus;

    answerType?: AnswerlatticeAnswerType;        // Guided Workflows (Item #2) — defaults to 'explanation' if undefined

    scope: {
        entityIds: string[];       // Mandatory ≥1 — bound ontology entities
        planIds?: string[];        // Optional plan restrictions
        roleIds?: string[];        // Optional role restrictions
        stateIds?: string[];       // Optional state conditions
    };

    productBinding: {
        introducedInVersion: number;         // Normalized integer
        lastValidatedInVersion: number;      // Normalized integer
        applicableVersions: {
            from: number;          // Normalized integer
            to?: number | null;    // null = current
        };
    };

    content: {
        structuredSummary: string;           // ≤500 chars — deterministic answer core
        detailedExplanation: string;         // Rich but declarative
        edgeCases?: string;                  // Optional
        constraints?: string;               // Limits, restrictions, caveats
        procedure?: AnswerlatticeProcedure;       // Guided Workflows (Item #2) — required when answerType === 'procedure'
    };

    evidence?: AnswerlatticeCanonicalEvidence;

    validation: {
        confidenceScore: number;             // 0-1 (derived, not manual)
        validationSource: AnswerlatticeValidationSource;
        lastValidatedOn: Timestamp;
        validatedBy: string;
    };

    signalMetrics: {
        linkedTicketCount: number;
        linkedChatCount: number;
        negativeFeedbackCount: number;
        lastSignalAt?: Timestamp;
    };

    governance: {
        driftFlag: boolean;
        driftReason?: string;
        reviewRequired: boolean;
    };

    // Auto-injected by requestBodyComposer
    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    createdBy?: string;
    modifiedBy?: string;
    uId?: string | number;
}

// ═══════════════════════════════════════════════════════════════
// FAQ MANAGEMENT
// Owner-reviewed short answers linked to articles and product surfaces.
// ═══════════════════════════════════════════════════════════════

export const ANSWERLATTICE_FAQ_STATUS = {
    DRAFT: 'draft',
    NEEDS_REVIEW: 'needs_review',
    PUBLISHED: 'published',
    ARCHIVED: 'archived',
} as const;

export type AnswerlatticeFaqStatus = typeof ANSWERLATTICE_FAQ_STATUS[keyof typeof ANSWERLATTICE_FAQ_STATUS];

export const ANSWERLATTICE_FAQ_SOURCE = {
    IMPORT: 'import',
    MANUAL: 'manual',
    TICKET_SIGNAL: 'ticket_signal',
    ARTICLE: 'article',
    KNOWLEDGE_INTAKE: 'knowledge_intake',
} as const;

export type AnswerlatticeFaqSource = typeof ANSWERLATTICE_FAQ_SOURCE[keyof typeof ANSWERLATTICE_FAQ_SOURCE];

export interface AnswerlatticeFaq extends AnswerlatticeDocumentIdentity {
    id: string;
    tId: number;
    sId: number;

    question: string;
    answer: string;
    status: AnswerlatticeFaqStatus;
    source: AnswerlatticeFaqSource;
    active: boolean;

    articleId?: string | null;
    articleTitle?: string | null;
    canonicalAnswerId?: string | null;
    entityIds?: string[];
    contextKeys?: string[];
    tags?: string[];

    likes?: number;
    dislikes?: number;
    sortOrder?: number;
    publishedOn?: Timestamp | null;
    lastReviewedOn?: Timestamp | null;
    reviewRequestedOn?: Timestamp | null;

    jobId?: string | null;
    generatedFromArticleId?: string | null;
    intakeJobId?: string | null;
    intakeReviewItemId?: string | null;
    intakeSourceIds?: string[];

    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    createdBy?: string;
    modifiedBy?: string;
    uId?: string | number;
}

/** Exact browser-safe FAQ projection. Persisted identity and audit fields stay server-side. */
export interface AnswerlatticePublicFaq {
    id: string;
    question: string;
    answer: string;
    articleId: string | null;
    tags: string[];
    likes: number;
    dislikes: number;
}

export interface AnswerlatticeGeneratedFaq {
    id?: string;
    question: string;
    answer: string;
    tags?: string[];
    contextKeys?: string[];
    entityIds?: string[];
    source?: AnswerlatticeFaqSource;
    sortOrder?: number;
}

// ═══════════════════════════════════════════════════════════════
// PILLAR 3 — DRIFT GOVERNANCE
// ═══════════════════════════════════════════════════════════════

export const ANSWERLATTICE_DRIFT_CLASS = {
    VERSION_MISMATCH: 'version_mismatch',
    SIGNAL_ANOMALY: 'signal_anomaly',
    SCOPE_CONFLICT: 'scope_conflict',
    DEPRECATED_ENTITY: 'deprecated_entity',
} as const;

export type AnswerlatticeDriftClass = typeof ANSWERLATTICE_DRIFT_CLASS[keyof typeof ANSWERLATTICE_DRIFT_CLASS];

export interface AnswerlatticeDriftEvent extends AnswerlatticeDocumentIdentity {
    id: string;
    tId: number;
    sId: number;

    answerId: string;
    driftClass: AnswerlatticeDriftClass;
    detectedAt: Timestamp;
    entityIds: string[];
    releaseVersion?: number;
    signalMetricsSnapshot?: {
        linkedTicketCount: number;
        linkedChatCount: number;
        negativeFeedbackCount: number;
    };

    createdOn?: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// PILLAR 4 — SIGNAL MUTATION ENGINE
// ═══════════════════════════════════════════════════════════════

export const ANSWERLATTICE_MUTATION_TYPE = {
    CONTENT_REFINEMENT: 'content_refinement',
    SCOPE_ADJUSTMENT: 'scope_adjustment',
    VERSION_UPDATE: 'version_update',
    NEW_ANSWER_REQUIRED: 'new_answer_required',
} as const;

export type AnswerlatticeMutationType = typeof ANSWERLATTICE_MUTATION_TYPE[keyof typeof ANSWERLATTICE_MUTATION_TYPE];

export const ANSWERLATTICE_MUTATION_STATUS = {
    PENDING_REVIEW: 'pending_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    IMPLEMENTED: 'implemented',
} as const;

export type AnswerlatticeMutationStatus = typeof ANSWERLATTICE_MUTATION_STATUS[keyof typeof ANSWERLATTICE_MUTATION_STATUS];

export const ANSWERLATTICE_SIGNAL_TYPE = {
    TICKET: 'ticket',
    CHAT_NEGATIVE: 'chat_negative',
    ESCALATION: 'escalation',
    FEEDBACK: 'feedback',
    GUIDED_RESOLUTION: 'guided_resolution',
    // Predictive Support (Expansion Item #12) — suggestion interaction signals
    SUGGESTION_SHOWN: 'suggestion_shown',
    SUGGESTION_CLICKED: 'suggestion_clicked',
    SUGGESTION_DISMISSED: 'suggestion_dismissed',
} as const;

export type AnswerlatticeSignalType = typeof ANSWERLATTICE_SIGNAL_TYPE[keyof typeof ANSWERLATTICE_SIGNAL_TYPE];

export interface AnswerlatticeMutationProposal extends AnswerlatticeDocumentIdentity {
    id: string;
    tId: number;
    sId: number;

    targetAnswerId: string;
    relatedEntityIds: string[];

    mutationType: AnswerlatticeMutationType;

    signalSummary: {
        ticketCount: number;
        chatCount: number;
        negativeFeedbackRate: number;
        exampleReferences: string[];
    };

    suggestedChange: {
        structuredSummary?: string;
        detailedExplanation?: string;
        edgeCases?: string;
        constraints?: string;
        procedure?: AnswerlatticeProcedure;       // Guided Workflows (Item #2) — for procedure refinement proposals

        // Automatic Knowledge Creation (Expansion Item #4) — additive fields, freeze-compliant
        // AI-generated draft content for new_answer_required proposals
        // Feature-flagged: ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE
        // @see __docs__/answerlattice/automatic-knowledge-creation/
        draftTitle?: string;                                           // AI-generated answer title
        draftStatus?: 'pending' | 'generated' | 'failed';             // Draft generation lifecycle
        draftSource?: 'signal_cluster' | 'recurring_fallback' | 'onboarding_bootstrap' | 'ticket_resolution' | 'knowledge_intake' | 'manual_authoring';  // What triggered the draft
        draftGeneratedAt?: Timestamp;                                  // When draft was generated
        draftSignalExamples?: string[];                                // Sample signal texts used for context (max 5)
        draftEntityContext?: string;                                   // Entity name + description used
        draftPromptVersion?: string;                                   // Prompt version for reproducibility
        draftProcessingRun?: {
            id: string;
            startedAt: Timestamp;
            leaseExpiresAt: Timestamp;
        } | null;
        lastDraftRequestId?: string;

        // Governed release rollback proposal metadata. The proposal remains
        // pending until a human reviews it; these fields never apply changes.
        reviewReason?: string;
        rollbackAuditLogId?: string;

        // Server-owned governance proposal payload. These additive fields keep
        // manual authoring and approved mutations inside the same review queue.
        proposedContent?: AnswerlatticeCanonicalAnswer['content'];
        proposedScope?: AnswerlatticeCanonicalAnswer['scope'];
        proposedProductBinding?: AnswerlatticeCanonicalAnswer['productBinding'];
        proposedStatus?: AnswerlatticeAnswerStatus;
        proposedAnswerType?: AnswerlatticeAnswerType;
        proposedEvidence?: AnswerlatticeCanonicalEvidence;
        baseAnswerFingerprint?: string;                                  // Approved answer snapshot this update was based on

        // Ticket → Knowledge Loop (Expansion Item #9) — additive fields, freeze-compliant
        // Tracks provenance from resolved tickets to canonical knowledge
        // Feature-flagged: ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE
        // @see __docs__/answerlattice/ticket-knowledge-loop/
        sourceTicketIds?: string[];                                        // Ticket IDs that contributed to this proposal
        sourceTicketCount?: number;                                        // How many tickets were accumulated
        resolutionContext?: string;                                        // Compressed summary of resolution patterns across tickets
        extractionConfidence?: number;                                     // 0-1 confidence of resolution extraction quality
    };

    confidenceScore: number;

    status: AnswerlatticeMutationStatus;

    reviewedBy?: string;
    reviewedOn?: Timestamp;
    implementedAnswerId?: string;
    implementedOn?: Timestamp;
    impactTracked?: boolean;
    impactResult?: {
        preSignalCount: number;
        postSignalCount: number;
        improvementPercent: number;
        trackedAt: Timestamp;
    };

    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    createdBy?: string;
    modifiedBy?: string;
}

export interface AnswerlatticeSignalEvent extends AnswerlatticeDocumentIdentity {
    id: string;
    tId: number;
    sId: number;

    entityId: string;
    type: AnswerlatticeSignalType;
    timestamp: Timestamp;
    /** Firestore TTL deadline. Optional only for legacy pre-TTL documents. */
    expiresAt?: Timestamp;
    metadata?: Record<string, any>;
    dedupKey?: string;
    /** Stable payload identity used to reject conflicting idempotent replays. */
    identityFingerprint?: string;
    processingRun?: {
        id: string;
        status: 'processing' | 'completed' | 'failed';
        startedAt: Timestamp;
        leaseExpiresAt: Timestamp;
        completedAt?: Timestamp | null;
    };

    createdOn?: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// RELEASES & VERSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

export const ANSWERLATTICE_RELEASE_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    ACTIVE: 'active',
} as const;

export type AnswerlatticeReleaseStatus = typeof ANSWERLATTICE_RELEASE_STATUS[keyof typeof ANSWERLATTICE_RELEASE_STATUS];

export interface AnswerlatticeRelease extends AnswerlatticeDocumentIdentity {
    id: string;
    tId: number;
    sId: number;

    versionLabel: string;        // e.g., "2.4.1"
    versionNormalized: number;   // e.g., 002004001
    releasedAt: Timestamp;
    entityChanges: string[];     // entityIds modified in this release
    status: AnswerlatticeReleaseStatus;
    requestFingerprint?: string;
    activation?: {
        requestId: string;
        startedAt: Timestamp;
        leaseExpiresAt: Timestamp;
    };
    driftEvaluation?: {
        status: 'completed' | 'failed';
        evaluatedAnswers: number;
        driftedAnswers: number;
        completedAt?: Timestamp;
        failedAt?: Timestamp;
        failureCode?: string;
    };
    activatedAt?: Timestamp;

    createdOn?: Timestamp;
    createdBy?: string;
    modifiedOn?: Timestamp;
    modifiedBy?: string;
}

// ═══════════════════════════════════════════════════════════════
// ENTITY SEARCH INDEX (Deterministic Retrieval)
// ═══════════════════════════════════════════════════════════════

export interface AnswerlatticeEntitySearchIndex extends AnswerlatticeDocumentIdentity {
    id: string;
    tId: number;
    sId: number;

    entityId: string;
    canonicalName: string;
    synonyms: string[];
    normalizedTokens: string[];
    prefixTokens?: string[];
    weight: number;

    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// ENTITY CANDIDATES (AI Extraction Staging)
// ═══════════════════════════════════════════════════════════════

export const ANSWERLATTICE_CANDIDATE_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    MERGED: 'merged',
} as const;

export type AnswerlatticeCandidateStatus = typeof ANSWERLATTICE_CANDIDATE_STATUS[keyof typeof ANSWERLATTICE_CANDIDATE_STATUS];

export interface AnswerlatticeEntityCandidate extends AnswerlatticeDocumentIdentity {
    id: string;
    tId: number;
    sId: number;

    name: string;
    type: AnswerlatticeEntityType;
    confidence: number;
    frequency: {
        articles: number;
        tickets: number;
        chat: number;
    };
    description: string;

    status: AnswerlatticeCandidateStatus;
    promotedEntityId?: string;
    sourceArticleIds?: string[];

    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════

export interface AnswerlatticeAuditLog extends AnswerlatticeDocumentIdentity {
    id: string;
    tId: number;
    sId: number;

    action: string;
    entityType: string;
    entityId: string;
    previousState?: Record<string, any>;
    newState?: Record<string, any>;
    performedBy: string;
    timestamp: Timestamp;

    createdOn?: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// ROLLOUT-GATED ADVANCED BRANDING PROFILE
// ═══════════════════════════════════════════════════════════════

/**
 * Private per-workspace branding profile.
 * Stored at platformSummary/branding_{tId}_{sId}.
 *
 * No customer-facing runtime currently consumes this profile. The working
 * widget branding contract remains the bounded stores/{sId}.widgetConfig.
 */
export interface AnswerlatticeBrandingConfig {
    companyName: string;
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    headerBackground?: string;
    headerTextColor?: string;
    poweredByVisible: boolean;
    supportEmail?: string;
    privacyPolicyUrl?: string;
    termsUrl?: string;
}

/**
 * Default branding config (used when white-label is off or no config set)
 */
export const ANSWERLATTICE_DEFAULT_BRANDING: AnswerlatticeBrandingConfig = {
    companyName: 'Help Center',
    primaryColor: '#1677ff',
    poweredByVisible: true,
};

// ═══════════════════════════════════════════════════════════════
// PHASE 4 — MULTI-LANGUAGE KB ARTICLES
// ═══════════════════════════════════════════════════════════════

/**
 * Locale-specific content for a KB article translation.
 * Stored as a map on the article document: translations.{locale} = ArticleTranslation
 *
 * Translation records are drafts unless an explicit review workflow marks them
 * approved. The current rollout-gated generator writes drafts only.
 */
export type AnswerlatticeArticleTranslationStatus = 'draft' | 'approved';

export interface AnswerlatticeArticleTranslation {
    locale: string;                   // e.g., 'hi-IN', 'es-ES', 'ar-SA'
    title: string;                    // Translated title
    content: any;                     // Translated TipTap JSON content
    status: AnswerlatticeArticleTranslationStatus;
    sourceLocale: 'en-US';
    sourceHash: string;                // SHA-256 of the source title/content used for this draft
    translatedBy: 'human' | 'ai';    // Who produced the translation
    translatedAt: Timestamp;
    reviewedBy?: string;              // Required with reviewedAt for approved status
    reviewedAt?: Timestamp;
}

/**
 * Supported locales for Answerlattice multi-language.
 * Subset of the platform's APP_LANGUAGES but specific to Answerlattice tenants.
 * Each tenant can enable a subset of these for their KB.
 */
export const ANSWERLATTICE_SUPPORTED_LOCALES = [
    'en-US', 'en-GB', 'hi-IN', 'ar-SA', 'es-ES',
    'fr-FR', 'de-DE', 'pt-BR', 'ja-JP', 'zh-CN',
    'ko-KR', 'it-IT', 'nl-NL', 'ru-RU', 'tr-TR',
] as const;

export type AnswerlatticeSupportedLocale = typeof ANSWERLATTICE_SUPPORTED_LOCALES[number];

// ═══════════════════════════════════════════════════════════════
// GUIDED WORKFLOWS (Expansion Item #2)
// Structured procedure answers for "how to" queries.
// Additive fields on AnswerlatticeCanonicalAnswer — freeze-compliant.
// Feature-flagged: ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS
// @see __docs__/answerlattice/guided-workflows/
// ═══════════════════════════════════════════════════════════════

export const ANSWERLATTICE_ANSWER_TYPES = {
    EXPLANATION: 'explanation',
    NAVIGATION: 'navigation',
    PROCEDURE: 'procedure',
} as const;

export type AnswerlatticeAnswerType = typeof ANSWERLATTICE_ANSWER_TYPES[keyof typeof ANSWERLATTICE_ANSWER_TYPES];

export const ANSWERLATTICE_PROCEDURE_ACTIONS = {
    OPEN: 'open',
    NAVIGATE: 'navigate',
    CLICK: 'click',
    SELECT: 'select',
    ENTER: 'enter',
    TOGGLE: 'toggle',
    SUBMIT: 'submit',
    CONFIRM: 'confirm',
    DOWNLOAD: 'download',
    UPLOAD: 'upload',
    COPY: 'copy',
    PASTE: 'paste',
    SCROLL: 'scroll',
    EXPAND: 'expand',
    COLLAPSE: 'collapse',
} as const;

export type AnswerlatticeProcedureAction = typeof ANSWERLATTICE_PROCEDURE_ACTIONS[keyof typeof ANSWERLATTICE_PROCEDURE_ACTIONS];

export const ANSWERLATTICE_WARNING_SEVERITY = {
    INFO: 'info',
    WARNING: 'warning',
    DESTRUCTIVE: 'destructive',
} as const;

export type AnswerlatticeWarningSeverity = typeof ANSWERLATTICE_WARNING_SEVERITY[keyof typeof ANSWERLATTICE_WARNING_SEVERITY];

export const ANSWERLATTICE_PREREQUISITE_TYPE = {
    ROLE: 'role',
    PLAN: 'plan',
    STATE: 'state',
    GENERAL: 'general',
} as const;

export type AnswerlatticePrerequisiteType = typeof ANSWERLATTICE_PREREQUISITE_TYPE[keyof typeof ANSWERLATTICE_PREREQUISITE_TYPE];

export interface AnswerlatticeProcedureStep {
    stepOrder: number;                     // 1-based integer
    action: AnswerlatticeProcedureAction;       // From approved vocabulary
    instruction: string;                   // ≤80 chars, human-readable
    target?: string;                       // Semantic data-answerlattice-target value (optional)
    expectedEvent?: string;                // Allowlisted host event that can advance this step
    expectedResult?: string;               // What should happen (optional, ≤120 chars)
    troubleshootingHint?: string;          // Fallback if step fails (optional, ≤200 chars)
}

export interface AnswerlatticeProcedureWarning {
    message: string;                       // ≤200 chars
    severity: AnswerlatticeWarningSeverity;
}

export interface AnswerlatticeProcedurePrerequisite {
    description: string;                   // ≤200 chars, human-readable
    type: AnswerlatticePrerequisiteType;
    value?: string;                        // Machine-readable identifier (e.g., "admin", "pro")
}

export interface AnswerlatticeProcedure {
    procedureSlug?: string;                // Optional human-readable ID (e.g., "invite_user") for analytics/dedup
    steps: AnswerlatticeProcedureStep[];        // 1-12 steps, required when answerType === 'procedure'
    warnings?: AnswerlatticeProcedureWarning[]; // 0-5 warnings
    prerequisites?: AnswerlatticeProcedurePrerequisite[]; // 0-5 prerequisites
}

export const ANSWERLATTICE_PROCEDURE_CONSTRAINTS = {
    MAX_STEPS: 12,
    MIN_STEPS: 1,
    MAX_INSTRUCTION_LENGTH: 80,
    MAX_TARGET_LENGTH: 120,
    MAX_EXPECTED_EVENT_LENGTH: 120,
    MAX_EXPECTED_RESULT_LENGTH: 120,
    MAX_TROUBLESHOOTING_HINT_LENGTH: 200,
    MAX_WARNING_MESSAGE_LENGTH: 200,
    MAX_PREREQUISITE_DESCRIPTION_LENGTH: 200,
    MAX_WARNINGS: 5,
    MAX_PREREQUISITES: 5,
    MAX_PROCEDURE_SLUG_LENGTH: 60,
} as const;

// ═══════════════════════════════════════════════════════════════
// CONTEXT-AWARE SUPPORT (Expansion Item #1)
// ═══════════════════════════════════════════════════════════════

/**
 * Context payload sent by client product alongside support queries.
 * Describes the user's current product state for context-aware retrieval.
 * 
 * All fields optional. System degrades gracefully without context.
 * Context is TRANSIENT — never persisted to Firestore.
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_CONTEXT_AWARE
 * @see __docs__/answerlattice/context-aware-support/
 */
export interface AnswerlatticeContextPayload {
    contextVersion?: number;       // Schema version (default: 1)
    contextKey?: string;           // Optional Answerlattice product surface key (e.g., "billing_invoices")
    path?: string;                 // Transient route path used only for deterministic surface matching
    title?: string;                // Optional safe page title; never required for matching
    feature?: string;              // Product subsystem (e.g., "integrations")
    page?: string;                 // UI location identifier (e.g., "stripe_integration_page")
    workflow?: string;             // Current action (e.g., "connect_integration")
    entityHints?: string[];        // Explicit entity references (max 5)
    role?: string;                 // Public client alias normalized into userRole
    userRole?: string;             // Permission level (e.g., "admin")
    locale?: string;               // Public locale label only
    plan?: string;                 // Subscription tier (e.g., "pro")
    state?: string;                // Product state used by state-scoped canonical answers
    version?: string;              // Product version label (for example "2.4.1")
    /**
     * Trusted runtime-only entity IDs resolved from Answerlattice-owned surface maps.
     * External client payloads cannot set this field because context validation
     * strips unknown fields. It is added server-side before retrieval.
     */
    surfaceEntityIds?: string[];
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT SURFACE CONTEXTS
// ═══════════════════════════════════════════════════════════════

export interface AnswerlatticeProductSurfaceVisibility {
    helpWidget: boolean;
    helpCenter: boolean;
    changelog: boolean;
}

export interface AnswerlatticeProductSurface extends AnswerlatticeDocumentIdentity {
    id: string;
    tId: number;
    sId: number;

    key: string;
    label: string;
    description?: string;
    routePatterns: string[];

    feature?: string;
    page?: string;
    workflow?: string;
    entityHints?: string[];
    entityIds?: string[];
    tags?: string[];

    visibility: AnswerlatticeProductSurfaceVisibility;
    active: boolean;
    priority: number;

    intakeJobId?: string | null;
    intakeReviewItemId?: string | null;
    intakeSourceIds?: string[];

    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    createdBy?: string;
    modifiedBy?: string;
    uId?: string | number;
}

export interface AnswerlatticeRelatedArticleRef {
    id: string;
    title: string;
    categoryTitle?: string;
    sectionTitle?: string;
    url?: string;
    tags?: string[];
}

export interface AnswerlatticeRelatedChangelogRef {
    id: string;
    pageId: string;
    title: string;
    version?: string | null;
    releasedOn?: any;
    tags?: string[];
}

export interface AnswerlatticeRelatedFaqRef {
    id: string;
    question: string;
    answer?: string;
    articleId?: string | null;
    articleTitle?: string | null;
    tags?: string[];
}

export interface AnswerlatticeSurfaceTicketStats {
    total: number;
    open: number;
    recentDisplayIds: string[];
}

export interface AnswerlatticeSurfaceContentItem {
    key: string;
    label: string;
    routePatterns: string[];
    feature?: string;
    page?: string;
    workflow?: string;
    entityHints?: string[];
    entityIds?: string[];
    tags?: string[];
    visibility?: AnswerlatticeProductSurfaceVisibility;
    articles: AnswerlatticeRelatedArticleRef[];
    changelogs: AnswerlatticeRelatedChangelogRef[];
    faqs?: AnswerlatticeRelatedFaqRef[];
    tickets: AnswerlatticeSurfaceTicketStats;
}

export interface AnswerlatticeSurfaceContentSummary {
    id?: string;
    pId?: ProductId;
    tId: number;
    sId: number;
    generatedAt?: any;
    surfaceCount: number;
    articleCount: number;
    faqCount?: number;
    changelogCount: number;
    ticketCount: number;
    surfaces: Record<string, AnswerlatticeSurfaceContentItem>;
}

// ═══════════════════════════════════════════════════════════════
// CLIENT ACTIVATION COMMAND CENTER
// Cost-optimized launch/readiness layer backed by compact summary docs.
// ═══════════════════════════════════════════════════════════════

export type AnswerlatticeActivationStepStatus = 'complete' | 'attention' | 'pending' | 'optional';
export type AnswerlatticeActivationStage = 'setup' | 'install' | 'knowledge' | 'live';

export interface AnswerlatticeWidgetRuntimeStatus {
    lastSeenAt?: any;
    lastOrigin?: string | null;
    lastPath?: string | null;
    lastContextKey?: string | null;
    lastFeature?: string | null;
    lastPage?: string | null;
    userAgentFamily?: string | null;
    seenCount?: number;
}

export interface AnswerlatticeActivationSubscriptionSummary {
    id?: string | null;
    planId?: string | null;
    planName?: string | null;
    status?: string | null;
    currency?: string | null;
    amount?: number | null;
    isBeta?: boolean;
    subscriptionEndDate?: any;
}

export interface AnswerlatticeActivationStep {
    key: string;
    title: string;
    description: string;
    status: AnswerlatticeActivationStepStatus;
    required: boolean;
    actionLabel?: string;
    route?: string;
    costNote?: string;
}

export interface AnswerlatticeLaunchProofItem {
    key: string;
    title: string;
    description: string;
    status: AnswerlatticeActivationStepStatus;
    actionLabel?: string;
    route?: string;
}

export interface AnswerlatticeLaunchProofSummary {
    ready: boolean;
    score: number;
    completeCount: number;
    totalCount: number;
    blockers: string[];
    items: AnswerlatticeLaunchProofItem[];
}

export interface AnswerlatticeActivationAnswerTestSummary {
    activeCaseCount: number;
    firstTenCount: number;
    latestProofStatus: 'ready' | 'review' | 'blocked' | null;
    latestCriticalFailureCount: number;
    latestProofStale: boolean;
    lastRunAt: string | null;
}

export type AnswerlatticeSurfaceReadinessStatus = 'ready' | 'needs_mapping' | 'needs_articles' | 'open_signals';

export interface AnswerlatticeSurfaceReadinessItem {
    key: string;
    label: string;
    routePatterns: string[];
    articleCount: number;
    faqCount?: number;
    changelogCount: number;
    ticketCount: number;
    openTicketCount: number;
    status: AnswerlatticeSurfaceReadinessStatus;
}

export interface AnswerlatticeActivationSummary {
    id?: string;
    pId?: ProductId;
    tId: number;
    sId: number;
    readinessScore: number;
    stage: AnswerlatticeActivationStage;
    computedAtIso: string;
    signature: string;
    workspace: {
        companyName?: string | null;
        productName?: string | null;
        productUrl?: string | null;
        supportEmail?: string | null;
        billingModel?: string | null;
        primarySurfaceCount?: number;
    };
    subscription: AnswerlatticeActivationSubscriptionSummary | null;
    widget: {
        hasWidgetKey: boolean;
        keyPrefix?: string | null;
        allowedOriginCount: number;
        configVersion: number;
        runtimeStatus?: AnswerlatticeWidgetRuntimeStatus | null;
    };
    notifications: {
        enabled: boolean;
        smtpConfigured: boolean;
        fromAddress?: string | null;
        logTarget?: string | null;
    };
    content: {
        surfaceCount: number;
        articleCount: number;
        faqCount?: number;
        changelogCount: number;
        ticketCount: number;
        summaryGeneratedAt?: any;
        surfaceReadiness: AnswerlatticeSurfaceReadinessItem[];
    };
    governance: {
        canonicalCoverageRate?: number | null;
        canonicalCoverageTotal?: number | null;
        noEscalationRate?: number | null;
        confirmedResolutionRate?: number | null;
        confirmedResolutionTotal?: number | null;
        driftRate?: number | null;
        entityAnswerCoverageRate?: number | null;
        metricsComplete?: boolean;
    };
    answerTests: AnswerlatticeActivationAnswerTestSummary;
    compiledContext?: AnswerlatticeCompiledContextReadiness | null;
    launchProof: AnswerlatticeLaunchProofSummary;
    steps: AnswerlatticeActivationStep[];
    readModel: {
        firestoreReads: number;
        firestoreWrites: string;
        source: string;
        legacySubscriptionFallbackUsed?: boolean;
        legacySubscriptionFallbackReadCap?: number;
    };
}

// ═══════════════════════════════════════════════════════════════
// ANSWERLATTICE OWNER OPERATIONS
// Summary-backed scheduler status for Activation Command Center.
// ═══════════════════════════════════════════════════════════════

export type AnswerlatticeOwnerOperationStatus =
    | 'completed'
    | 'success'
    | 'partial'
    | 'running'
    | 'skipped'
    | 'not_started'
    | 'failed';

export interface AnswerlatticeOperationsScheduleSummary {
    timeZone: string;
    businessDayEndTime: string;
    settlementLocalTime: string;
    settlementBufferMinutes: number;
    description: string;
}

export interface AnswerlatticeOperationsTaskSummary {
    lastStatus: AnswerlatticeOwnerOperationStatus | null;
    lastRunId: string | null;
    lastAttemptAt: string | null;
    lastFinishedAt: string | null;
    lastDurationMs: number;
    lastActivity: boolean;
    lastError: string | null;
    lastDetails: Record<string, any>;
}

export interface AnswerlatticeOperationsWorkspaceSummary {
    status: AnswerlatticeOwnerOperationStatus;
    lastAttemptedLocalDate: string | null;
    lastAttemptedAt: string | null;
    lastCompletedLocalDate: string | null;
    lastCompletedAt: string | null;
    lastFailedLocalDate: string | null;
    lastFailedAt: string | null;
    lastDetails: Record<string, any>;
}

export interface AnswerlatticeOperationsRunSummary {
    id: string;
    status: AnswerlatticeOwnerOperationStatus | null;
    trigger: string | null;
    startedAt: string | null;
    completedAt: string | null;
    durationMs: number;
    tenantStatus: AnswerlatticeOwnerOperationStatus | null;
    taskCount: number;
    errorCount: number;
    totals: Record<string, any>;
}

export interface AnswerlatticeOperationsStatusSummary {
    schedule: AnswerlatticeOperationsScheduleSummary;
    masterScheduler: {
        schedulerName: string;
        updatedAt: string | null;
        governanceTask: AnswerlatticeOperationsTaskSummary;
    };
    workspace: AnswerlatticeOperationsWorkspaceSummary;
    latestRuns: AnswerlatticeOperationsRunSummary[];
    readModel: {
        firestoreReads: number;
        source: string;
        runLogReadCap: number;
        workspaceRunMatches: number;
    };
}

// ═══════════════════════════════════════════════════════════════
// COMPILED CONTEXT DISTRIBUTION
// Storage-backed approved context for widget, public API, and MCP runtimes.
// Feature-flagged: ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES
// @see __docs__/answerlattice/compiled-context-distribution/
// ═══════════════════════════════════════════════════════════════

export const ANSWERLATTICE_CONTEXT_SOURCE_KEYS = {
    WORKSPACE_PROFILE: 'workspaceProfile',
    WIDGET_CONFIG: 'widgetConfig',
    KB: 'kb',
    DOCS_NAV: 'docsNav',
    ENTITIES: 'entities',
    ENTITY_RELATIONS: 'entityRelations',
    CANONICAL: 'canonical',
    SURFACES: 'surfaces',
    RELEASES: 'releases',
    BRANDING: 'branding',
    MCP_POLICY: 'mcpPolicy',
    PREDICTIVE_TRIGGERS: 'predictiveTriggers',
} as const;

export type AnswerlatticeContextSourceKey = typeof ANSWERLATTICE_CONTEXT_SOURCE_KEYS[keyof typeof ANSWERLATTICE_CONTEXT_SOURCE_KEYS];

export type AnswerlatticeCompiledSourceVersions = Partial<Record<AnswerlatticeContextSourceKey, number>> & {
    schemaVersion?: number;
    pId?: ProductId;
    tId?: number;
    sId?: number;
    updatedAt?: any;
    lastReason?: string;
    lastSourceId?: string;
    lastSourceType?: string;
};

export type AnswerlatticeBundleStatus = 'empty' | 'building' | 'ready' | 'stale' | 'failed' | 'superseded';

export interface AnswerlatticeBundleFileRef {
    path: string;
    bytes: number;
    hash: string;
    contentType?: string;
    cacheControl?: string;
    url?: string;
}

export interface AnswerlatticeContextBundleStats {
    entities: number;
    entityRelations: number;
    canonicalAnswers: number;
    surfaces: number;
    routes: number;
    articles: number;
    faqs: number;
    releases: number;
    bytesTotal: number;
    publicBytesTotal: number;
    privateBytesTotal: number;
}

export interface AnswerlatticeContextBundleLimits {
    maxPublicBootstrapBytes: number;
    maxPublicRouteBytes: number;
    maxPublicObjectBytes: number;
    maxPrivateObjectBytes: number;
    maxMcpResponseBytes: number;
    maxMcpToolCallsPerMinute: number;
}

export interface AnswerlatticeContextBundleManifest extends AnswerlatticeDocumentIdentity {
    id?: string;
    schemaVersion: number;
    tId: number;
    sId: number;
    publicBundleId: string;
    bundleVersion: number;
    activeVersion: number;
    lastReadyVersion: number;
    status: AnswerlatticeBundleStatus;
    generatedAt?: any;
    lastBuildStartedAt?: any;
    lastBuildCompletedAt?: any;
    lastBuildError?: string | null;
    staleReason?: string | null;
    hash?: string;
    sourceVersions: AnswerlatticeCompiledSourceVersions;
    stats: AnswerlatticeContextBundleStats;
    bundles: Record<string, AnswerlatticeBundleFileRef>;
    limits: AnswerlatticeContextBundleLimits;
}

export interface AnswerlatticeCompiledContextReadiness {
    status: AnswerlatticeBundleStatus;
    bundleVersion: number;
    activeVersion: number;
    lastReadyVersion: number;
    publicBundleId?: string | null;
    generatedAt?: any;
    lastBuildCompletedAt?: any;
    lastBuildError?: string | null;
    staleReason?: string | null;
    stats?: Partial<AnswerlatticeContextBundleStats>;
    limits?: Partial<AnswerlatticeContextBundleLimits>;
    publicBundlesReady: boolean;
    privateBundlesReady: boolean;
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT FRICTION INTELLIGENCE (Expansion Item #5)
// Nightly friction aggregation + weekly AI insight generation.
// Feature-flagged: ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE
// @see __docs__/answerlattice/product-friction-intelligence/
// ═══════════════════════════════════════════════════════════════

export type AnswerlatticeFrictionTrendDirection = 'rising' | 'stable' | 'improving' | 'new';
export type AnswerlatticeFrictionLevel = 'HIGH' | 'MODERATE' | 'LOW';
/** @deprecated Use AnswerlatticeFrictionLevel. */
export type AnswerlatticeFrictionHealth = AnswerlatticeFrictionLevel;

export interface AnswerlatticeSupportMetricWindow {
    kind: 'rolling_24_hours' | 'utc_calendar_7_days';
    startAt: Timestamp;
    endAt: Timestamp;
    complete: boolean;
    sourceLimit: number;
    observedCount: number;
    currentStartDate?: string;
    currentEndDate?: string;
    previousStartDate?: string;
    previousEndDate?: string;
}

export interface AnswerlatticeFrictionDailyStat {
    id?: string;
    pId: 'AL';
    tId: number;
    sId: number;
    schemaVersion: number;
    entityId: string;
    entityName: string;
    entityType: string;
    date: string;              // YYYY-MM-DD

    queryCount: number;
    ticketCount: number;
    chatNegativeCount: number;
    escalationCount: number;
    lowConfidenceCount: number;

    frictionScore: number;

    createdOn?: Timestamp;
}

export interface AnswerlatticeFrictionEntitySummary {
    entityId: string;
    entityName: string;
    entityType: string;
    last7d: {
        queryCount: number;
        escalationCount: number;
        lowConfidenceCount: number;
        frictionScore: number;
    };
    previous7d: {
        queryCount: number;
        frictionScore: number;
    };
    trendDirection: AnswerlatticeFrictionTrendDirection;
    trendScore: number;
}

export interface AnswerlatticeFrictionEmergingTopic {
    entityId: string;
    entityName: string;
    entityType: string;
    queryCount: number;
    escalationRate: number;
    firstSeenDate: string;
}

export interface AnswerlatticeFrictionSnapshot {
    pId: 'AL';
    tId: number;
    sId: number;
    schemaVersion: number;
    lastUpdated: Timestamp;
    window: AnswerlatticeSupportMetricWindow;
    topFrictionEntities: AnswerlatticeFrictionEntitySummary[];
    emergingTopics: AnswerlatticeFrictionEmergingTopic[];
    frictionLevel: AnswerlatticeFrictionLevel;
    totalWeightedLoad: number;
    /** @deprecated Compatibility alias for frictionLevel. */
    overallHealth?: AnswerlatticeFrictionHealth;
    totalSignals7d: number;
    totalEscalations7d: number;
    unmappedEvidenceCount: number;
    legacyDailyStatCount: number;
}

export interface AnswerlatticeFrictionInsight {
    pId: 'AL';
    tId: number;
    sId: number;
    schemaVersion: number;
    lastUpdated: Timestamp;
    weekStart: string;
    weekEnd: string;
    summary: string;
    advisory: true;
    sourceSnapshotUpdatedAt: Timestamp;
    suggestedActions: Array<{
        entityId: string;
        action: string;
    }>;
    /** @deprecated Deterministic top entities belong to the source snapshot. */
    topFrictions?: Array<{
        entityName: string;
        entityType: string;
        signalCount: number;
        escalationRate: number;
        trend: string;
        suggestedAction: string;
    }>;
    /** @deprecated Use advisory summary and suggestedActions. */
    emergingTopics?: string[];
    frictionLevel: AnswerlatticeFrictionLevel;
    /** @deprecated Compatibility alias for frictionLevel. */
    overallHealth?: AnswerlatticeFrictionHealth;
    promptVersion: string;
    generatedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// FOUNDER TRUST LAYER (Expansion Item #10)
// Nightly aggregated trust metrics for founder confidence dashboard.
// Feature-flagged: ENABLE_ANSWERLATTICE_TRUST_METRICS
// @see __docs__/answerlattice/founder-trust-layer/
// ═══════════════════════════════════════════════════════════════

export interface AnswerlatticeTrustMetricsTopEntity {
    entityId: string;
    entityName: string;
    entityType: string;
    queryCount: number;
    escalationCount: number;
    reliabilityScore: number;    // 0-100
    failureScore: number;        // Weighted composite
    evidenceCount: number;
    negativeFeedbackCount: number;
    canonicalMissCount: number;
    weightedLoad: number;
}

export interface AnswerlatticeTrustMetricsEscalationBreakdown {
    knowledgeGap: number;        // Entity matched, no answer
    lowConfidence: number;       // Answer confidence < 0.6
    entityMismatch: number;      // Wrong entity resolved
    retrievalFailure: number;    // No entity match
    userRequested: number;       // Explicit human request
    total: number;
}

export interface AnswerlatticeTrustMetrics {
    pId: 'AL';
    tId: number;
    sId: number;
    schemaVersion: number;
    lastUpdated: Timestamp;
    date: string;                    // YYYY-MM-DD
    window: AnswerlatticeSupportMetricWindow;
    sourceCompleteness: {
        complete: boolean;
        activeAnswers: number;
        activeEntities: number;
        signalEvents: number;
        searchHistory: number;
    };

    coverage: {
        rate: number;                // 0-100 (percentage)
        hits: number;                // Canonical answer served
        misses: number;              // Fell through to RAG
        total: number;               // hits + misses
        previousRate: number;        // Yesterday's rate (for trend)
    };

    /** @deprecated Use nonEscalation; this is not verified customer resolution. */
    resolution?: {
        rate: number;                // 0-100 (percentage without escalation)
        resolved: number;            // Queries without escalation, not explicit resolution proof
        escalated: number;           // Queries with escalation signal
        total: number;
        previousRate: number;        // Yesterday's rate (for trend)
    };

    nonEscalation: {
        rate: number;
        withoutEscalation: number;
        escalated: number;
        total: number;
        previousRate: number;
    };

    confirmedResolution?: {
        rate: number;                // Explicit resolved / all explicit outcomes
        confirmedResolved: number;
        confirmedNotResolved: number;
        explicitOutcomeTotal: number;
        recontactEligible: number;
        recontactedSameSession: number;
        previousRate: number;
        observationWindowHours: number;
    };

    drift: {
        rate: number;                // 0-100 (percentage — lower is better)
        driftedCount: number;        // Answers with driftFlag=true
        activeCount: number;         // Total active answers
        previousRate: number;        // Yesterday's rate (for trend)
    };

    /** @deprecated Use entityAnswerCoverage; no opaque entity health score is presented. */
    entityHealth?: {
        avgScore: number;            // 0-100 (weighted average)
        healthyCount: number;        // Entities with score ≥ 80
        attentionCount: number;      // Entities with score 40-79
        criticalCount: number;       // Entities with score < 40
        totalEntities: number;
        previousAvgScore: number;    // Yesterday's score (for trend)
    };

    entityAnswerCoverage: {
        rate: number;
        coveredCount: number;
        uncoveredCount: number;
        driftedCoveredCount: number;
        totalEntities: number;
        previousRate: number;
    };

    topFailingEntities: AnswerlatticeTrustMetricsTopEntity[];

    escalationBreakdown: AnswerlatticeTrustMetricsEscalationBreakdown;
}

// ═══════════════════════════════════════════════════════════════
// KNOWLEDGE GRAPH EXPLOITATION (Expansion Item #11)
// Multi-entity retrieval via 1-hop graph traversal.
// Feature-flagged: ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH
// @see __docs__/answerlattice/knowledge-graph-exploitation/
// ═══════════════════════════════════════════════════════════════

export const ANSWERLATTICE_INTERACTION_TYPES = {
    DEPENDENCY: 'dependency',
    INHERITANCE: 'inheritance',
    CONFLICT: 'conflict',
    PRECEDENCE: 'precedence',
    PERMISSION: 'permission',
    WORKFLOW: 'workflow',
} as const;

export type AnswerlatticeInteractionType = typeof ANSWERLATTICE_INTERACTION_TYPES[keyof typeof ANSWERLATTICE_INTERACTION_TYPES];

export interface AnswerlatticeInteractionRule {
    id: string;
    entities: string[];                      // 2+ entityIds that interact
    interactionType: AnswerlatticeInteractionType;
    explanation: string;                     // ≤300 chars, human-authored
    relatedAnswerIds?: string[];
    confidence: number;                      // 0-1
    active: boolean;
}

export interface AnswerlatticeEntityGraphNode {
    name: string;
    type: string;
    related: string[];                       // entityIds from all relation types
    relationTypes: Record<string, string[]>; // relationType → entityIds
    answerCount: number;                     // Active canonical answers bound to this entity
}

export interface AnswerlatticeEntityGraphIndex {
    pId?: 'AL';
    tId?: number;
    sId?: number;
    lastRebuiltAt: Timestamp;
    version: number;
    entityCount: number;
    relationCount: number;
    graph: Record<string, AnswerlatticeEntityGraphNode>;
    interactionRules?: AnswerlatticeInteractionRule[];
}

export interface AnswerlatticeGraphExpansionResult {
    originalEntities: string[];
    expandedEntities: string[];
    expansionSource: 'graph_index' | 'none';
    interactionDetected?: {
        ruleId: string;
        interactionType: AnswerlatticeInteractionType;
        explanation: string;
    };
    relatedSuggestions?: Array<{
        entityId: string;
        entityName: string;
    }>;
}

// ═══════════════════════════════════════════════════════════════
// PREDICTIVE SUPPORT (Expansion Item #12)
// Rule-based proactive help that prevents support tickets.
// Feature-flagged: ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT
// @see __docs__/answerlattice/predictive-support/
// ═══════════════════════════════════════════════════════════════

export const ANSWERLATTICE_TRIGGER_ACTION_TYPES = {
    HELP_CARD: 'help_card',
    WORKFLOW_GUIDE: 'workflow_guide',
    LINK_ARTICLE: 'link_article',
    KNOWN_ISSUE: 'known_issue',
} as const;

export type AnswerlatticeTriggerActionType = typeof ANSWERLATTICE_TRIGGER_ACTION_TYPES[keyof typeof ANSWERLATTICE_TRIGGER_ACTION_TYPES];

export const ANSWERLATTICE_TRIGGER_STATUS = {
    ACTIVE: 'active',
    SUGGESTED: 'suggested',
    DISABLED: 'disabled',
    ARCHIVED: 'archived',
} as const;

export type AnswerlatticeTriggerStatus = typeof ANSWERLATTICE_TRIGGER_STATUS[keyof typeof ANSWERLATTICE_TRIGGER_STATUS];

export const ANSWERLATTICE_TRIGGER_SOURCE = {
    MANUAL: 'manual',
    FRICTION_AUTO: 'friction_auto',
    SYSTEM: 'system',
} as const;

export type AnswerlatticeTriggerSource = typeof ANSWERLATTICE_TRIGGER_SOURCE[keyof typeof ANSWERLATTICE_TRIGGER_SOURCE];

export interface AnswerlatticePredictiveTrigger {
    id: string;
    pId?: 'AL';
    tId: number;
    sId: number;

    name: string;
    description?: string;
    kind?: 'predictive_help' | 'known_issue';

    conditions: {
        page?: string;
        feature?: string;
        workflow?: string;
        plan?: string;
        userRole?: string;
    };

    action: {
        type: AnswerlatticeTriggerActionType;
        entityId?: string;
        articleId?: string;
        customTitle?: string;
        customSummary?: string;
    };

    resolvedSuggestion?: {
        title: string;
        summary: string;
        sourceAnswerId?: string;
        sourceAnswerVersion?: string | number;
        articles?: Array<{
            id: string;
            title: string;
        }>;
        procedure?: AnswerlatticeProcedure;
    };

    priority: number;
    cooldownHours: number;
    maxImpressionsPerUser?: number;

    status: AnswerlatticeTriggerStatus;
    source: AnswerlatticeTriggerSource;

    effectiveness?: {
        impressions: number;
        clicks: number;
        dismissals: number;
        score: number;
        lastEvaluated?: Timestamp;
    };

    frictionSource?: {
        entityId: string;
        entityName: string;
        frictionScore: number;
        signalCount: number;
    };

    knownIssue?: {
        severity: 'info' | 'degraded' | 'outage';
        startsAt?: Timestamp;
        endsAt?: Timestamp | null;
        statusPageUrl?: string;
    };

    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    createdBy?: string;
}

export interface AnswerlatticePredictiveTriggerIndex {
    pId?: 'AL';
    tId: number;
    sId: number;
    lastUpdated: Timestamp;
    version: number;
    triggerCount: number;
    activeTriggerCount?: number;
    triggers: Record<string, AnswerlatticePredictiveTrigger>;
}

export interface AnswerlatticePredictiveSuggestion {
    triggerId: string;
    type: AnswerlatticeTriggerActionType;
    title: string;
    summary: string;
    articles?: Array<{
        id: string;
        title: string;
    }>;
    procedure?: AnswerlatticeProcedure;
    relatedEntities?: Array<{
        entityId: string;
        entityName: string;
    }>;
    knownIssue?: {
        severity: 'info' | 'degraded' | 'outage';
        statusPageUrl?: string;
    };
}

export const ANSWERLATTICE_ONTOLOGY_CONSTRAINTS = {
    MAX_ENTITIES_PER_TENANT: 500,
    MAX_CANONICAL_ANSWERS_PER_TENANT: 1000,
    MAX_RELATIONS_PER_ENTITY: 20,
    MAX_ALIASES_PER_ENTITY: 20,
    MAX_ENTITY_CANDIDATES_PENDING: 100,
} as const;

export const ANSWERLATTICE_PREDICTIVE_CONSTRAINTS = {
    MAX_TRIGGERS_PER_TENANT: 200,
    MAX_AUTO_SUGGESTIONS_PER_NIGHT: 5,
    MIN_COOLDOWN_HOURS: 1,
    MAX_COOLDOWN_HOURS: 720,
    MIN_PRIORITY: 0,
    MAX_PRIORITY: 100,
    MAX_NAME_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 300,
    MAX_CUSTOM_SUMMARY_LENGTH: 200,
    MIN_FRICTION_SCORE_FOR_SUGGESTION: 5,
} as const;

// ═══════════════════════════════════════════════════════════════
// SUPPORT BOARD
// Private owner/staff workboard for support gaps and knowledge follow-up.
// Feature-flagged: ENABLE_ANSWERLATTICE_SUPPORT_BOARD
// @see __docs__/answerlattice/support-board/
// ═══════════════════════════════════════════════════════════════

export const ANSWERLATTICE_SUPPORT_BOARD_STATUS = {
    NEW_SIGNALS: 'new_signals',
    NEEDS_TRIAGE: 'needs_triage',
    NEEDS_ANSWER: 'needs_answer',
    DRAFT_READY: 'draft_ready',
    APPROVED_PUBLISHED: 'approved_published',
    RESOLVED: 'resolved',
} as const;

export type AnswerlatticeSupportBoardStatus = typeof ANSWERLATTICE_SUPPORT_BOARD_STATUS[keyof typeof ANSWERLATTICE_SUPPORT_BOARD_STATUS];

export const ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE = {
    MANUAL: 'manual',
    TICKET: 'ticket',
    FEEDBACK: 'feedback',
    CONVERSATION: 'conversation',
    SIGNAL: 'signal',
    MUTATION_PROPOSAL: 'mutation_proposal',
    CANONICAL_ANSWER: 'canonical_answer',
    RELEASE: 'release',
    SURFACE: 'surface',
} as const;

export type AnswerlatticeSupportBoardSourceType = typeof ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE[keyof typeof ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE];

export const ANSWERLATTICE_SUPPORT_BOARD_PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
} as const;

export type AnswerlatticeSupportBoardPriority = typeof ANSWERLATTICE_SUPPORT_BOARD_PRIORITY[keyof typeof ANSWERLATTICE_SUPPORT_BOARD_PRIORITY];

export const ANSWERLATTICE_SUPPORT_BOARD_NOTE_STATUS = {
    OPEN: 'open',
    PINNED: 'pinned',
    RESOLVED: 'resolved',
} as const;

export type AnswerlatticeSupportBoardNoteStatus = typeof ANSWERLATTICE_SUPPORT_BOARD_NOTE_STATUS[keyof typeof ANSWERLATTICE_SUPPORT_BOARD_NOTE_STATUS];

export interface AnswerlatticeSupportBoardNote {
    id: string;
    text: string;
    status: AnswerlatticeSupportBoardNoteStatus;
    authorId: string;
    authorName: string;
    createdAt: Timestamp;
}

export interface AnswerlatticeSupportBoardStatusEntry {
    status: AnswerlatticeSupportBoardStatus;
    timestamp: Timestamp;
    createdBy: {
        id: string;
        name: string;
        email: string;
    };
    remark: string;
}

export interface AnswerlatticeSupportBoardCard extends AnswerlatticeDocumentIdentity {
    id: string;
    tId: number;
    sId: number;

    title: string;
    description: string;
    status: AnswerlatticeSupportBoardStatus;
    priority: AnswerlatticeSupportBoardPriority;
    sourceType: AnswerlatticeSupportBoardSourceType;
    sourceId?: string | null;
    sourceCustomerName?: string | null;
    sourceCustomerEmail?: string | null;
    sourceCustomerPhone?: string | null;
    sourceCustomerUserId?: string | null;
    sourceOrigin?: string | null;
    sourcePath?: string | null;
    sourceSessionId?: string | null;
    sourceIdentityRedactedAt?: Timestamp | null;
    sourceIdentityRedactedBy?: string | null;

    assigneeId?: string | null;
    assigneeName?: string | null;
    dueDate?: string | null;
    tags?: string[];

    relatedTicketId?: string | null;
    relatedConversationId?: string | null;
    relatedAnswerId?: string | null;
    relatedProposalId?: string | null;
    relatedReleaseId?: string | null;
    relatedSurfaceId?: string | null;
    relatedEntityId?: string | null;
    relatedContextKeys?: string[];

    notes?: AnswerlatticeSupportBoardNote[];
    notesCount?: number;
    lastNoteAt?: Timestamp | null;
    statuses?: AnswerlatticeSupportBoardStatusEntry[];

    resolvedOn?: Timestamp | null;
    resolvedBy?: string | null;

    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    createdBy?: string;
    modifiedBy?: string;
    uId?: string | number;
}

export const ANSWERLATTICE_SUPPORT_BOARD_CONSTRAINTS = {
    MAX_CARDS_PER_LOAD: 120,
    MAX_SOURCE_SYNC_ITEMS: 50,
    MAX_NOTES_PER_CARD: 25,
    MAX_TAGS_PER_CARD: 8,
    MAX_TAG_LENGTH: 48,
    MAX_TITLE_LENGTH: 140,
    MAX_DESCRIPTION_LENGTH: 1200,
    MAX_NOTE_LENGTH: 1000,
    MAX_STATUS_HISTORY_PER_CARD: 50,
    MAX_REFERENCE_ID_LENGTH: 180,
    MAX_DUE_DATE_LENGTH: 10,
    MAX_ACTOR_ID_LENGTH: 100,
    MAX_ACTOR_NAME_LENGTH: 100,
    MAX_ACTOR_EMAIL_LENGTH: 160,
    MAX_CUSTOMER_NAME_LENGTH: 160,
    MAX_CUSTOMER_EMAIL_LENGTH: 180,
    MAX_CUSTOMER_PHONE_LENGTH: 80,
    MAX_SOURCE_USER_ID_LENGTH: 120,
    MAX_SOURCE_LOCATION_LENGTH: 180,
    MAX_SOURCE_SESSION_ID_LENGTH: 120,
    MAX_STATUS_REMARK_LENGTH: 240,
} as const;

export interface AnswerlatticeSupportBoardSummary extends AnswerlatticeDocumentIdentity {
    id?: string;
    tId: number;
    sId: number;
    statusCounts?: Record<string, number>;
    priorityCounts?: Record<string, number>;
    sourceCounts?: Record<string, number>;
    topSurfaces?: Array<{ surfaceId: string; count: number }>;
    openCards: number;
    needsAnswerCards: number;
    highPriorityCards: number;
    totalRecentCards: number;
    lastSync?: {
        candidatesAnalyzed: number;
        cardsCreated: number;
        cardsUpdated: number;
        cardsSkippedResolved: number;
        cardsSkippedUnchanged: number;
        windowDays: number;
        maxCardsCreatedOrUpdatedPerRun: number;
        sourceWindowsSaturated?: boolean;
    };
    lastUpdated?: Timestamp;
    liveSummaryVersion?: number;
    liveSummaryUpdatedAt?: Timestamp;
    breakdownFresh?: boolean;
    sourceWindowsSaturated?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// KNOWLEDGE INTAKE COMMAND CENTER
// Private owner intake workspace for docs, URLs, FAQs, release notes, and notes.
// Feature-flagged: ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE
// @see __docs__/answerlattice/knowledge-intake-command-center/
// ═══════════════════════════════════════════════════════════════

export const ANSWERLATTICE_KNOWLEDGE_INTAKE_STATUS = {
    DRAFT: 'draft',
    COLLECTING: 'collecting',
    REVIEWING: 'reviewing',
    PUBLISHING: 'publishing',
    PUBLISHED: 'published',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
} as const;

export type AnswerlatticeKnowledgeIntakeStatus = typeof ANSWERLATTICE_KNOWLEDGE_INTAKE_STATUS[keyof typeof ANSWERLATTICE_KNOWLEDGE_INTAKE_STATUS];

export const ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE = {
    WEBSITE_PAGE: 'website_page',
    HELP_DOC: 'help_doc',
    FAQ: 'faq',
    CHANGELOG: 'changelog',
    TICKET_MACRO: 'ticket_macro',
    REPEATED_REPLY: 'repeated_reply',
    PRODUCT_NOTE: 'product_note',
    FILE_TEXT: 'file_text',
    MARKDOWN: 'markdown',
    CSV: 'csv',
    PDF_TEXT: 'pdf_text',
    DOCX_TEXT: 'docx_text',
    SCREENSHOT_NOTE: 'screenshot_note',
    SCREENSHOT_OCR: 'screenshot_ocr',
    MEDIA_TRANSCRIPT: 'media_transcript',
} as const;

export type AnswerlatticeKnowledgeSourceType = typeof ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE[keyof typeof ANSWERLATTICE_KNOWLEDGE_SOURCE_TYPE];

export const ANSWERLATTICE_INTAKE_REVIEW_TARGET = {
    KB_ARTICLE: 'kb_article',
    FAQ: 'faq',
    CANONICAL_PROPOSAL: 'canonical_proposal',
    PRODUCT_SURFACE: 'product_surface',
    // Legacy read guard only. Intake must not create or publish changelog review targets.
    CHANGELOG: 'changelog',
} as const;

export type AnswerlatticeIntakeReviewTarget = typeof ANSWERLATTICE_INTAKE_REVIEW_TARGET[keyof typeof ANSWERLATTICE_INTAKE_REVIEW_TARGET];

export const ANSWERLATTICE_INTAKE_REVIEW_STATUS = {
    DRAFT: 'draft',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    PUBLISHED: 'published',
} as const;

export type AnswerlatticeIntakeReviewStatus = typeof ANSWERLATTICE_INTAKE_REVIEW_STATUS[keyof typeof ANSWERLATTICE_INTAKE_REVIEW_STATUS];

export const ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS = {
    MAX_JOBS_PER_LOAD: 20,
    MAX_SOURCES_PER_JOB: 50,
    MAX_REVIEW_ITEMS_PER_JOB: 120,
    MAX_SOURCES_TO_ANALYZE: 30,
    MAX_PUBLISH_ITEMS: 50,
    MAX_SOURCE_TEXT_CHARS: 40_000,
    MAX_SOURCE_EXCERPT_CHARS: 1_200,
    MAX_IMAGE_OCR_BYTES: 5 * 1024 * 1024,
    MAX_MEDIA_TRANSCRIPTION_BYTES: 8 * 1024 * 1024,
    MAX_REVIEW_BODY_CHARS: 12_000,
    MAX_REVIEW_SOURCE_IDS: 5,
    MAX_LINK_DISCOVERY_RESULTS: 30,
    MAX_DISCOVERY_FETCH_BYTES: 180_000,
    MAX_TAGS: 20,
    MAX_ENTITY_IDS: 25,
    MAX_CONTEXT_KEYS: 20,
} as const;

export interface AnswerlatticeKnowledgeIntakeJob extends AnswerlatticeDocumentIdentity {
    id: string;
    pId: typeof import('@constant/product').PRODUCT_IDS.ANSWERLATTICE;
    tId: number;
    sId: number;
    title: string;
    status: AnswerlatticeKnowledgeIntakeStatus;
    description?: string;
    productWebsiteUrl?: string | null;
    appUrl?: string | null;
    targetAudience?: string | null;
    defaultCategoryId?: string;
    defaultCategoryTitle?: string;
    defaultSectionId?: string;
    defaultSectionTitle?: string;
    sourceCount: number;
    readySourceCount?: number;
    reviewItemCount: number;
    acceptedItemCount: number;
    publishedItemCount: number;
    rejectedItemCount?: number;
    usageUnitsConsumed?: number;
    usageSummary?: Record<string, any>;
    analysisRun?: {
        id: string;
        sourceHash: string;
        status: 'processing' | 'completed' | 'failed';
        startedAt: Timestamp;
        leaseExpiresAt: Timestamp;
        completedAt?: Timestamp | null;
        createdCount?: number;
    };
    launchPackRun?: {
        id: string;
        sourceHash: string;
        status: 'processing' | 'completed' | 'failed';
        startedAt: Timestamp;
        leaseExpiresAt: Timestamp;
        completedAt?: Timestamp | null;
        reviewItemIds?: string[];
        createdCount?: number;
        usageLedgerId?: string | null;
    };
    publishRun?: {
        id: string;
        status: 'processing' | 'completed' | 'failed';
        itemIds: string[];
        startedAt: Timestamp;
        leaseExpiresAt: Timestamp;
        completedAt?: Timestamp | null;
        publishedCount?: number;
    };
    lastAnalyzedAt?: Timestamp | null;
    publishedOn?: Timestamp | null;
    errorMessage?: string | null;
    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    createdBy?: string;
    modifiedBy?: string;
    uId?: string | number;
}

export interface AnswerlatticeKnowledgeSource extends AnswerlatticeDocumentIdentity {
    id: string;
    pId: typeof import('@constant/product').PRODUCT_IDS.ANSWERLATTICE;
    tId: number;
    sId: number;
    jobId: string;
    type: AnswerlatticeKnowledgeSourceType;
    title: string;
    status: 'processing' | 'ready' | 'needs_text' | 'failed';
    originUrl?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
    contentText?: string | null;
    contentExcerpt?: string;
    contentHash: string;
    tags?: string[];
    contextKeys?: string[];
    entityIds?: string[];
    metadata?: Record<string, any>;
    processingRun?: {
        id: string;
        status: 'processing' | 'completed' | 'failed';
        startedAt: Timestamp;
        leaseExpiresAt: Timestamp;
        completedAt?: Timestamp | null;
    };
    errorMessage?: string | null;
    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    createdBy?: string;
    modifiedBy?: string;
    uId?: string | number;
}

export interface AnswerlatticeIntakeReviewItem extends AnswerlatticeDocumentIdentity {
    id: string;
    pId: typeof import('@constant/product').PRODUCT_IDS.ANSWERLATTICE;
    tId: number;
    sId: number;
    jobId: string;
    sourceId?: string | null;
    sourceIds?: string[];
    target: AnswerlatticeIntakeReviewTarget;
    status: AnswerlatticeIntakeReviewStatus;
    title: string;
    body?: string;
    question?: string;
    answer?: string;
    answerType?: AnswerlatticeAnswerType;
    procedure?: AnswerlatticeProcedure;
    routePath?: string | null;
    versionLabel?: string | null;
    tags?: string[];
    contextKeys?: string[];
    entityIds?: string[];
    confidenceScore?: number;
    reason?: string;
    launchPack?: {
        version: 1;
        sourceHash: string;
        sourceIds: string[];
        missingEvidence: string[];
        expectedSource: 'canonical' | 'escalation' | 'no_answer';
        riskLevel: 'standard' | 'critical';
        requiresEscalation: boolean;
        position: number;
        applicability?: {
            path?: string;
            feature?: string;
            workflow?: string;
            plan?: string;
            role?: string;
            version?: string;
        };
    };
    publishTargetId?: string | null;
    publishedOn?: Timestamp | null;
    sortOrder?: number;
    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    createdBy?: string;
    modifiedBy?: string;
    uId?: string | number;
}

export interface AnswerlatticeKnowledgeIntakeSummary extends AnswerlatticeDocumentIdentity {
    id?: string;
    pId: typeof import('@constant/product').PRODUCT_IDS.ANSWERLATTICE;
    tId: number;
    sId: number;
    activeJobId?: string | null;
    activeJobTitle?: string | null;
    activeJobs: number;
    recentJobs: number;
    sourceCount?: number;
    readySources: number;
    reviewItems: number;
    acceptedItems: number;
    publishedItems: number;
    rejectedItems?: number;
    usageUnitsConsumed?: number;
    lastJobStatus?: AnswerlatticeKnowledgeIntakeStatus | null;
    summaryHash?: string;
    lastPublishedAt?: Timestamp | null;
    lastUpdated?: Timestamp;
}

export interface AnswerlatticeKnowledgeIntakeBundle {
    job: AnswerlatticeKnowledgeIntakeJob | null;
    sources: AnswerlatticeKnowledgeSource[];
    reviewItems: AnswerlatticeIntakeReviewItem[];
}

// ═══════════════════════════════════════════════════════════════
// VERSION NORMALIZATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Convert semantic version string to normalized integer for fast comparison.
 * "2.4.1" → 2004001
 * "1.12.3" → 1012003
 * 
 * Format: MAJOR * 1_000_000 + MINOR * 1_000 + PATCH
 */
export function normalizeVersion(versionLabel: string): number {
    const parts = versionLabel.split('.').map(Number);
    const major = parts[0] || 0;
    const minor = parts[1] || 0;
    const patch = parts[2] || 0;
    return major * 1_000_000 + minor * 1_000 + patch;
}

/**
 * Convert normalized integer back to semantic version string.
 * 2004001 → "2.4.1"
 */
export function denormalizeVersion(normalized: number): string {
    const major = Math.floor(normalized / 1_000_000);
    const minor = Math.floor((normalized % 1_000_000) / 1_000);
    const patch = normalized % 1_000;
    return `${major}.${minor}.${patch}`;
}
