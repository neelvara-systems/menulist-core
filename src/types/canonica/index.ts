/**
 * Canonica — Support Knowledge Control Plane
 * 
 * Type definitions for the 5-pillar architecture:
 * 1. Product Ontology (entities, relations)
 * 2. Canonical Answer Engine (governed answers)
 * 3. Drift Governance (4 drift classes)
 * 4. Signal Mutation (mutation proposals)
 * 5. API & Integration (releases, audit)
 * 
 * @see __docs__/canonica/doctrine/05-architecture-evolution.md
 * 
 * FREEZE RULE: Core schemas are frozen for 3 years.
 * Only additive fields allowed. No breaking changes.
 * @see __docs__/canonica/doctrine/03-infrastructure-freeze-v1.md
 */

import { Timestamp } from "firebase/firestore";

// ═══════════════════════════════════════════════════════════════
// PILLAR 1 — PRODUCT ONTOLOGY
// ═══════════════════════════════════════════════════════════════

export const CANONICA_ENTITY_TYPES = {
    FEATURE: 'feature',
    PLAN: 'plan',
    ROLE: 'role',
    WORKFLOW: 'workflow',
    STATE: 'state',
    INTEGRATION: 'integration',
    ERROR: 'error',
} as const;

export type CanonicaEntityType = typeof CANONICA_ENTITY_TYPES[keyof typeof CANONICA_ENTITY_TYPES];

export const CANONICA_ENTITY_STATUS = {
    ACTIVE: 'active',
    DEPRECATED: 'deprecated',
    BETA: 'beta',
} as const;

export type CanonicaEntityStatus = typeof CANONICA_ENTITY_STATUS[keyof typeof CANONICA_ENTITY_STATUS];

export interface CanonicaEntity {
    id: string;
    tId: number;
    sId: number;

    type: CanonicaEntityType;
    name: string;
    slug: string;
    description: string;

    status: CanonicaEntityStatus;

    aliases?: string[];   // Lowercase alias phrases that resolve to this entity (max 20)

    currentVersion: number; // Normalized integer (e.g., 002004001 for 2.4.1)

    // Auto-injected by requestBodyComposer
    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    createdBy?: string;
    modifiedBy?: string;
    uId?: number;
}

export const CANONICA_RELATION_TYPES = {
    AVAILABLE_IN: 'available_in',
    RESTRICTED_BY: 'restricted_by',
    REQUIRES: 'requires',
    PART_OF: 'part_of',
    TRANSITIONS_TO: 'transitions_to',
    TRIGGERS: 'triggers',
} as const;

export type CanonicaRelationType = typeof CANONICA_RELATION_TYPES[keyof typeof CANONICA_RELATION_TYPES];

export interface CanonicaEntityRelation {
    id: string;
    tId: number;
    sId: number;

    fromEntityId: string;
    toEntityId: string;
    relationType: CanonicaRelationType;

    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// PILLAR 2 — CANONICAL ANSWER ENGINE
// ═══════════════════════════════════════════════════════════════

export const CANONICA_ANSWER_STATUS = {
    ACTIVE: 'active',
    NEEDS_REVIEW: 'needs_review',
    DEPRECATED: 'deprecated',
    ARCHIVED: 'archived',
} as const;

export type CanonicaAnswerStatus = typeof CANONICA_ANSWER_STATUS[keyof typeof CANONICA_ANSWER_STATUS];

export const CANONICA_VALIDATION_SOURCE = {
    MANUAL: 'manual',
    SIGNAL_CLUSTER: 'signal_cluster',
    RELEASE_REVIEW: 'release_review',
} as const;

export type CanonicaValidationSource = typeof CANONICA_VALIDATION_SOURCE[keyof typeof CANONICA_VALIDATION_SOURCE];

export interface CanonicaCanonicalAnswer {
    id: string;
    tId: number;
    sId: number;

    title: string;
    slug: string;

    status: CanonicaAnswerStatus;

    answerType?: CanonicaAnswerType;        // Guided Workflows (Item #2) — defaults to 'explanation' if undefined

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
        procedure?: CanonicaProcedure;       // Guided Workflows (Item #2) — required when answerType === 'procedure'
    };

    validation: {
        confidenceScore: number;             // 0-1 (derived, not manual)
        validationSource: CanonicaValidationSource;
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
    uId?: number;
}

// ═══════════════════════════════════════════════════════════════
// PILLAR 3 — DRIFT GOVERNANCE
// ═══════════════════════════════════════════════════════════════

export const CANONICA_DRIFT_CLASS = {
    VERSION_MISMATCH: 'version_mismatch',
    SIGNAL_ANOMALY: 'signal_anomaly',
    SCOPE_CONFLICT: 'scope_conflict',
    DEPRECATED_ENTITY: 'deprecated_entity',
} as const;

export type CanonicaDriftClass = typeof CANONICA_DRIFT_CLASS[keyof typeof CANONICA_DRIFT_CLASS];

export interface CanonicaDriftEvent {
    id: string;
    tId: number;
    sId: number;

    answerId: string;
    driftClass: CanonicaDriftClass;
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

export const CANONICA_MUTATION_TYPE = {
    CONTENT_REFINEMENT: 'content_refinement',
    SCOPE_ADJUSTMENT: 'scope_adjustment',
    VERSION_UPDATE: 'version_update',
    NEW_ANSWER_REQUIRED: 'new_answer_required',
} as const;

export type CanonicaMutationType = typeof CANONICA_MUTATION_TYPE[keyof typeof CANONICA_MUTATION_TYPE];

export const CANONICA_MUTATION_STATUS = {
    PENDING_REVIEW: 'pending_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    IMPLEMENTED: 'implemented',
} as const;

export type CanonicaMutationStatus = typeof CANONICA_MUTATION_STATUS[keyof typeof CANONICA_MUTATION_STATUS];

export const CANONICA_SIGNAL_TYPE = {
    TICKET: 'ticket',
    CHAT_NEGATIVE: 'chat_negative',
    ESCALATION: 'escalation',
    // Predictive Support (Expansion Item #12) — suggestion interaction signals
    SUGGESTION_SHOWN: 'suggestion_shown',
    SUGGESTION_CLICKED: 'suggestion_clicked',
    SUGGESTION_DISMISSED: 'suggestion_dismissed',
} as const;

export type CanonicaSignalType = typeof CANONICA_SIGNAL_TYPE[keyof typeof CANONICA_SIGNAL_TYPE];

export interface CanonicaMutationProposal {
    id: string;
    tId: number;
    sId: number;

    targetAnswerId: string;
    relatedEntityIds: string[];

    mutationType: CanonicaMutationType;

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
        procedure?: CanonicaProcedure;       // Guided Workflows (Item #2) — for procedure refinement proposals

        // Automatic Knowledge Creation (Expansion Item #4) — additive fields, freeze-compliant
        // AI-generated draft content for new_answer_required proposals
        // Feature-flagged: ENABLE_CANONICA_AUTO_KNOWLEDGE
        // @see __docs__/canonica/automatic-knowledge-creation/
        draftTitle?: string;                                           // AI-generated answer title
        draftStatus?: 'pending' | 'generated' | 'failed';             // Draft generation lifecycle
        draftSource?: 'signal_cluster' | 'recurring_fallback' | 'onboarding_bootstrap' | 'ticket_resolution';  // What triggered the draft
        draftGeneratedAt?: Timestamp;                                  // When draft was generated
        draftSignalExamples?: string[];                                // Sample signal texts used for context (max 5)
        draftEntityContext?: string;                                   // Entity name + description used
        draftPromptVersion?: string;                                   // Prompt version for reproducibility

        // Ticket → Knowledge Loop (Expansion Item #9) — additive fields, freeze-compliant
        // Tracks provenance from resolved tickets to canonical knowledge
        // Feature-flagged: ENABLE_CANONICA_TICKET_KNOWLEDGE
        // @see __docs__/canonica/ticket-knowledge-loop/
        sourceTicketIds?: string[];                                        // Ticket IDs that contributed to this proposal
        sourceTicketCount?: number;                                        // How many tickets were accumulated
        resolutionContext?: string;                                        // Compressed summary of resolution patterns across tickets
        extractionConfidence?: number;                                     // 0-1 confidence of resolution extraction quality
    };

    confidenceScore: number;

    status: CanonicaMutationStatus;

    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    createdBy?: string;
    modifiedBy?: string;
}

export interface CanonicaSignalEvent {
    id: string;
    tId: number;
    sId: number;

    entityId: string;
    type: CanonicaSignalType;
    timestamp: Timestamp;
    metadata?: Record<string, any>;

    createdOn?: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// RELEASES & VERSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

export const CANONICA_RELEASE_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    ACTIVE: 'active',
} as const;

export type CanonicaReleaseStatus = typeof CANONICA_RELEASE_STATUS[keyof typeof CANONICA_RELEASE_STATUS];

export interface CanonicaRelease {
    id: string;
    tId: number;
    sId: number;

    versionLabel: string;        // e.g., "2.4.1"
    versionNormalized: number;   // e.g., 002004001
    releasedAt: Timestamp;
    entityChanges: string[];     // entityIds modified in this release
    status: CanonicaReleaseStatus;

    createdOn?: Timestamp;
    createdBy?: string;
}

// ═══════════════════════════════════════════════════════════════
// ENTITY SEARCH INDEX (Deterministic Retrieval)
// ═══════════════════════════════════════════════════════════════

export interface CanonicaEntitySearchIndex {
    id: string;
    tId: number;
    sId: number;

    entityId: string;
    canonicalName: string;
    synonyms: string[];
    normalizedTokens: string[];
    weight: number;

    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// ENTITY CANDIDATES (AI Extraction Staging)
// ═══════════════════════════════════════════════════════════════

export const CANONICA_CANDIDATE_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    MERGED: 'merged',
} as const;

export type CanonicaCandidateStatus = typeof CANONICA_CANDIDATE_STATUS[keyof typeof CANONICA_CANDIDATE_STATUS];

export interface CanonicaEntityCandidate {
    id: string;
    tId: number;
    sId: number;

    name: string;
    type: CanonicaEntityType;
    confidence: number;
    frequency: {
        articles: number;
        tickets: number;
        chat: number;
    };
    description: string;

    status: CanonicaCandidateStatus;

    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════

export interface CanonicaAuditLog {
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
// PHASE 4 — WHITE-LABEL / CUSTOM BRANDING
// ═══════════════════════════════════════════════════════════════

/**
 * Per-tenant branding configuration.
 * Stored on the Canonica client/store document (no new collection).
 * Controls appearance of: help widget, KB pages, email notifications.
 * 
 * Phase 4 — Competitive differentiator for B2B SaaS clients.
 */
export interface CanonicaBrandingConfig {
    companyName: string;
    logoUrl?: string;                // URL to company logo (max 200KB)
    faviconUrl?: string;             // URL to favicon
    primaryColor: string;            // Hex color for primary actions/links
    accentColor?: string;            // Hex color for secondary elements
    backgroundColor?: string;        // Hex color for page background
    textColor?: string;              // Hex color for body text
    headerBackground?: string;       // Hex color for header/nav background
    headerTextColor?: string;        // Hex color for header text
    fontFamily?: string;             // CSS font-family value
    customCss?: string;              // Optional custom CSS snippet (≤2000 chars, sanitized)
    poweredByVisible: boolean;       // Show "Powered by Canonica" badge (default true)
    supportEmail?: string;           // Contact email shown in help center
    privacyPolicyUrl?: string;       // Link to privacy policy
    termsUrl?: string;               // Link to terms of service
}

/**
 * Default branding config (used when white-label is off or no config set)
 */
export const CANONICA_DEFAULT_BRANDING: CanonicaBrandingConfig = {
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
 * Phase 4 — 75% of internet users non-English.
 */
export interface CanonicaArticleTranslation {
    locale: string;                   // e.g., 'hi-IN', 'es-ES', 'ar-SA'
    title: string;                    // Translated title
    content: any;                     // Translated TipTap JSON content
    translatedBy: 'human' | 'ai';    // Who produced the translation
    translatedAt: Timestamp;
    reviewedBy?: string;              // Human reviewer (if AI-translated)
    reviewedAt?: Timestamp;
}

/**
 * Supported locales for Canonica multi-language.
 * Subset of the platform's APP_LANGUAGES but specific to Canonica tenants.
 * Each tenant can enable a subset of these for their KB.
 */
export const CANONICA_SUPPORTED_LOCALES = [
    'en-US', 'en-GB', 'hi-IN', 'ar-SA', 'es-ES',
    'fr-FR', 'de-DE', 'pt-BR', 'ja-JP', 'zh-CN',
    'ko-KR', 'it-IT', 'nl-NL', 'ru-RU', 'tr-TR',
] as const;

export type CanonicaSupportedLocale = typeof CANONICA_SUPPORTED_LOCALES[number];

// ═══════════════════════════════════════════════════════════════
// GUIDED WORKFLOWS (Expansion Item #2)
// Structured procedure answers for "how to" queries.
// Additive fields on CanonicaCanonicalAnswer — freeze-compliant.
// Feature-flagged: ENABLE_CANONICA_GUIDED_WORKFLOWS
// @see __docs__/canonica/guided-workflows/
// ═══════════════════════════════════════════════════════════════

export const CANONICA_ANSWER_TYPES = {
    EXPLANATION: 'explanation',
    NAVIGATION: 'navigation',
    PROCEDURE: 'procedure',
} as const;

export type CanonicaAnswerType = typeof CANONICA_ANSWER_TYPES[keyof typeof CANONICA_ANSWER_TYPES];

export const CANONICA_PROCEDURE_ACTIONS = {
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

export type CanonicaProcedureAction = typeof CANONICA_PROCEDURE_ACTIONS[keyof typeof CANONICA_PROCEDURE_ACTIONS];

export const CANONICA_WARNING_SEVERITY = {
    INFO: 'info',
    WARNING: 'warning',
    DESTRUCTIVE: 'destructive',
} as const;

export type CanonicaWarningSeverity = typeof CANONICA_WARNING_SEVERITY[keyof typeof CANONICA_WARNING_SEVERITY];

export const CANONICA_PREREQUISITE_TYPE = {
    ROLE: 'role',
    PLAN: 'plan',
    STATE: 'state',
    GENERAL: 'general',
} as const;

export type CanonicaPrerequisiteType = typeof CANONICA_PREREQUISITE_TYPE[keyof typeof CANONICA_PREREQUISITE_TYPE];

export interface CanonicaProcedureStep {
    stepOrder: number;                     // 1-based integer
    action: CanonicaProcedureAction;       // From approved vocabulary
    instruction: string;                   // ≤80 chars, human-readable
    target?: string;                       // UI element identifier (optional)
    expectedResult?: string;               // What should happen (optional, ≤120 chars)
    troubleshootingHint?: string;          // Fallback if step fails (optional, ≤200 chars)
}

export interface CanonicaProcedureWarning {
    message: string;                       // ≤200 chars
    severity: CanonicaWarningSeverity;
}

export interface CanonicaProcedurePrerequisite {
    description: string;                   // ≤200 chars, human-readable
    type: CanonicaPrerequisiteType;
    value?: string;                        // Machine-readable identifier (e.g., "admin", "pro")
}

export interface CanonicaProcedure {
    procedureSlug?: string;                // Optional human-readable ID (e.g., "invite_user") for analytics/dedup
    steps: CanonicaProcedureStep[];        // 1-12 steps, required when answerType === 'procedure'
    warnings?: CanonicaProcedureWarning[]; // 0-5 warnings
    prerequisites?: CanonicaProcedurePrerequisite[]; // 0-5 prerequisites
}

export const CANONICA_PROCEDURE_CONSTRAINTS = {
    MAX_STEPS: 12,
    MIN_STEPS: 1,
    MAX_INSTRUCTION_LENGTH: 80,
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
 * Feature-flagged: ENABLE_CANONICA_CONTEXT_AWARE
 * @see __docs__/canonica/context-aware-support/
 */
export interface CanonicaContextPayload {
    contextVersion?: number;       // Schema version (default: 1)
    feature?: string;              // Product subsystem (e.g., "integrations")
    page?: string;                 // UI location identifier (e.g., "stripe_integration_page")
    workflow?: string;             // Current action (e.g., "connect_integration")
    entityHints?: string[];        // Explicit entity references (max 5)
    userRole?: string;             // Permission level (e.g., "admin")
    plan?: string;                 // Subscription tier (e.g., "pro")
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT FRICTION INTELLIGENCE (Expansion Item #5)
// Nightly friction aggregation + weekly AI insight generation.
// Feature-flagged: ENABLE_CANONICA_FRICTION_INTELLIGENCE
// @see __docs__/canonica/product-friction-intelligence/
// ═══════════════════════════════════════════════════════════════

export type CanonicaFrictionTrendDirection = 'rising' | 'stable' | 'improving' | 'new';
export type CanonicaFrictionHealth = 'HIGH' | 'MODERATE' | 'LOW';

export interface CanonicaFrictionDailyStat {
    id?: string;
    tId: number;
    sId: number;
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

export interface CanonicaFrictionEntitySummary {
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
    trendDirection: CanonicaFrictionTrendDirection;
    trendScore: number;
}

export interface CanonicaFrictionEmergingTopic {
    entityId: string;
    entityName: string;
    entityType: string;
    queryCount: number;
    escalationRate: number;
    firstSeenDate: string;
}

export interface CanonicaFrictionSnapshot {
    lastUpdated: Timestamp;
    topFrictionEntities: CanonicaFrictionEntitySummary[];
    emergingTopics: CanonicaFrictionEmergingTopic[];
    overallHealth: CanonicaFrictionHealth;
    totalSignals7d: number;
    totalEscalations7d: number;
}

export interface CanonicaFrictionInsight {
    lastUpdated: Timestamp;
    weekStart: string;
    weekEnd: string;
    summary: string;
    topFrictions: Array<{
        entityName: string;
        entityType: string;
        signalCount: number;
        escalationRate: number;
        trend: string;
        suggestedAction: string;
    }>;
    emergingTopics: string[];
    overallHealth: CanonicaFrictionHealth;
    promptVersion: string;
    generatedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// FOUNDER TRUST LAYER (Expansion Item #10)
// Nightly aggregated trust metrics for founder confidence dashboard.
// Feature-flagged: ENABLE_CANONICA_TRUST_METRICS
// @see __docs__/canonica/founder-trust-layer/
// ═══════════════════════════════════════════════════════════════

export interface CanonicaTrustMetricsTopEntity {
    entityId: string;
    entityName: string;
    entityType: string;
    queryCount: number;
    escalationCount: number;
    reliabilityScore: number;    // 0-100
    failureScore: number;        // Weighted composite
}

export interface CanonicaTrustMetricsEscalationBreakdown {
    knowledgeGap: number;        // Entity matched, no answer
    lowConfidence: number;       // Answer confidence < 0.6
    entityMismatch: number;      // Wrong entity resolved
    retrievalFailure: number;    // No entity match
    userRequested: number;       // Explicit human request
    total: number;
}

export interface CanonicaTrustMetrics {
    lastUpdated: Timestamp;
    date: string;                    // YYYY-MM-DD

    coverage: {
        rate: number;                // 0-100 (percentage)
        hits: number;                // Canonical answer served
        misses: number;              // Fell through to RAG
        total: number;               // hits + misses
        previousRate: number;        // Yesterday's rate (for trend)
    };

    resolution: {
        rate: number;                // 0-100 (percentage)
        resolved: number;            // Queries without escalation
        escalated: number;           // Queries with escalation signal
        total: number;
        previousRate: number;        // Yesterday's rate (for trend)
    };

    drift: {
        rate: number;                // 0-100 (percentage — lower is better)
        driftedCount: number;        // Answers with driftFlag=true
        activeCount: number;         // Total active answers
        previousRate: number;        // Yesterday's rate (for trend)
    };

    entityHealth: {
        avgScore: number;            // 0-100 (weighted average)
        healthyCount: number;        // Entities with score ≥ 80
        attentionCount: number;      // Entities with score 40-79
        criticalCount: number;       // Entities with score < 40
        totalEntities: number;
        previousAvgScore: number;    // Yesterday's score (for trend)
    };

    topFailingEntities: CanonicaTrustMetricsTopEntity[];

    escalationBreakdown: CanonicaTrustMetricsEscalationBreakdown;
}

// ═══════════════════════════════════════════════════════════════
// KNOWLEDGE GRAPH EXPLOITATION (Expansion Item #11)
// Multi-entity retrieval via 1-hop graph traversal.
// Feature-flagged: ENABLE_CANONICA_KNOWLEDGE_GRAPH
// @see __docs__/canonica/knowledge-graph-exploitation/
// ═══════════════════════════════════════════════════════════════

export const CANONICA_INTERACTION_TYPES = {
    DEPENDENCY: 'dependency',
    INHERITANCE: 'inheritance',
    CONFLICT: 'conflict',
    PRECEDENCE: 'precedence',
    PERMISSION: 'permission',
    WORKFLOW: 'workflow',
} as const;

export type CanonicaInteractionType = typeof CANONICA_INTERACTION_TYPES[keyof typeof CANONICA_INTERACTION_TYPES];

export interface CanonicaInteractionRule {
    id: string;
    entities: string[];                      // 2+ entityIds that interact
    interactionType: CanonicaInteractionType;
    explanation: string;                     // ≤300 chars, human-authored
    relatedAnswerIds?: string[];
    confidence: number;                      // 0-1
    active: boolean;
}

export interface CanonicaEntityGraphNode {
    name: string;
    type: string;
    related: string[];                       // entityIds from all relation types
    relationTypes: Record<string, string[]>; // relationType → entityIds
    answerCount: number;                     // Active canonical answers bound to this entity
}

export interface CanonicaEntityGraphIndex {
    lastRebuiltAt: Timestamp;
    version: number;
    entityCount: number;
    relationCount: number;
    graph: Record<string, CanonicaEntityGraphNode>;
    interactionRules?: CanonicaInteractionRule[];
}

export interface CanonicaGraphExpansionResult {
    originalEntities: string[];
    expandedEntities: string[];
    expansionSource: 'graph_index' | 'none';
    interactionDetected?: {
        ruleId: string;
        interactionType: CanonicaInteractionType;
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
// Feature-flagged: ENABLE_CANONICA_PREDICTIVE_SUPPORT
// @see __docs__/canonica/predictive-support/
// ═══════════════════════════════════════════════════════════════

export const CANONICA_TRIGGER_ACTION_TYPES = {
    HELP_CARD: 'help_card',
    WORKFLOW_GUIDE: 'workflow_guide',
    LINK_ARTICLE: 'link_article',
} as const;

export type CanonicaTriggerActionType = typeof CANONICA_TRIGGER_ACTION_TYPES[keyof typeof CANONICA_TRIGGER_ACTION_TYPES];

export const CANONICA_TRIGGER_STATUS = {
    ACTIVE: 'active',
    SUGGESTED: 'suggested',
    DISABLED: 'disabled',
    ARCHIVED: 'archived',
} as const;

export type CanonicaTriggerStatus = typeof CANONICA_TRIGGER_STATUS[keyof typeof CANONICA_TRIGGER_STATUS];

export const CANONICA_TRIGGER_SOURCE = {
    MANUAL: 'manual',
    FRICTION_AUTO: 'friction_auto',
    SYSTEM: 'system',
} as const;

export type CanonicaTriggerSource = typeof CANONICA_TRIGGER_SOURCE[keyof typeof CANONICA_TRIGGER_SOURCE];

export interface CanonicaPredictiveTrigger {
    id: string;
    tId: number;
    sId: number;

    name: string;
    description?: string;

    conditions: {
        page?: string;
        feature?: string;
        workflow?: string;
        plan?: string;
        userRole?: string;
    };

    action: {
        type: CanonicaTriggerActionType;
        entityId?: string;
        articleId?: string;
        customTitle?: string;
        customSummary?: string;
    };

    priority: number;
    cooldownHours: number;
    maxImpressionsPerUser?: number;

    status: CanonicaTriggerStatus;
    source: CanonicaTriggerSource;

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

    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    createdBy?: string;
}

export interface CanonicaPredictiveTriggerIndex {
    tId: number;
    sId: number;
    lastUpdated: Timestamp;
    version: number;
    triggerCount: number;
    triggers: Record<string, CanonicaPredictiveTrigger>;
}

export interface CanonicaPredictiveSuggestion {
    triggerId: string;
    type: CanonicaTriggerActionType;
    title: string;
    summary: string;
    articles?: Array<{
        id: string;
        title: string;
    }>;
    procedure?: CanonicaProcedure;
    relatedEntities?: Array<{
        entityId: string;
        entityName: string;
    }>;
}

export const CANONICA_ONTOLOGY_CONSTRAINTS = {
    MAX_ENTITIES_PER_TENANT: 500,
    MAX_CANONICAL_ANSWERS_PER_TENANT: 1000,
    MAX_RELATIONS_PER_ENTITY: 20,
    MAX_ALIASES_PER_ENTITY: 20,
    MAX_ENTITY_CANDIDATES_PENDING: 100,
} as const;

export const CANONICA_PREDICTIVE_CONSTRAINTS = {
    MAX_TRIGGERS_PER_TENANT: 200,
    MAX_AUTO_SUGGESTIONS_PER_NIGHT: 5,
    MIN_COOLDOWN_HOURS: 1,
    MAX_COOLDOWN_HOURS: 720,
    MIN_PRIORITY: 0,
    MAX_PRIORITY: 100,
    MAX_NAME_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 300,
    MAX_CUSTOM_SUMMARY_LENGTH: 200,
    AUTO_DISABLE_SCORE_THRESHOLD: -0.3,
    AUTO_DISABLE_MIN_IMPRESSIONS: 100,
    MIN_FRICTION_SCORE_FOR_SUGGESTION: 5,
} as const;

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
