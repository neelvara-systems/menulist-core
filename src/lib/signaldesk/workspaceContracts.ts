import { SIGNALDESK_COLLECTIONS, SIGNALDESK_SUMMARY_DOCS } from "@constant/signaldesk/database";
import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
import {
    getSignalDeskSpendPeriod,
    parseSignalDeskBudgetPolicyDocument,
    parseSignalDeskProviderAccountDocument,
    type SignalDeskSpendPeriod,
} from "@lib/signaldesk/accountingContracts";
import {
    parseSignalDeskConversationSummaryDocument,
    parseSignalDeskOutcomeSummaryDocument,
} from "@lib/signaldesk/outcomeContracts";
import { parseSignalDeskTargetScoreDocument } from "@lib/signaldesk/targetContracts";
import type { SignalDeskWorkspaceData } from "@type/signaldesk";
import { z } from "zod";

type WorkspaceArrayKey = {
    [Key in keyof SignalDeskWorkspaceData]: SignalDeskWorkspaceData[Key] extends readonly unknown[] ? Key : never;
}[keyof SignalDeskWorkspaceData];

type WorkspaceItem<Key extends WorkspaceArrayKey> = SignalDeskWorkspaceData[Key] extends readonly (infer Item)[]
    ? Item
    : never;

type WorkspaceProjectedArrayKey =
    | "activationWatches"
    | "aiVolumeRuns"
    | "aiWorkerRuns"
    | "approvalPackets"
    | "approvals"
    | "audienceSegments"
    | "auditEvents"
    | "budgetPolicies"
    | "channelHealth"
    | "channelWindows"
    | "commercialOffers"
    | "commercialOpportunities"
    | "connectorSettings"
    | "conversations"
    | "demandSignals"
    | "drafts"
    | "enrichmentResults"
    | "enrichmentWaterfalls"
    | "evidencePackets"
    | "modelEvals"
    | "modelRoutes"
    | "operatingEnvelopes"
    | "outcomes"
    | "providerAccounts"
    | "providerEvaluations"
    | "providerEvents"
    | "providerSourceRetentions"
    | "replyPlaybooks"
    | "revenueAccounts"
    | "revenueControlSummaries"
    | "runTimelines"
    | "scores"
    | "sequencerHandoffs"
    | "sequencerSteps"
    | "sourceQualitySnapshots"
    | "strategistMemos"
    | "teamMembers"
    | "templates"
    | "trustPartnerDeals"
    | "trustPartnerDeliverables"
    | "trustPartnerMetrics"
    | "trustPartnerNicheTests"
    | "trustPartnerProfiles"
    | "trustPartnerRenewalDecisions"
    | "vendorRuns";

export type SignalDeskWorkspaceProjection = WorkspaceItem<WorkspaceProjectedArrayKey>;

export const SIGNALDESK_WORKSPACE_GENERIC_COLLECTIONS = [
    SIGNALDESK_COLLECTIONS.ACTIVATION_WATCHES,
    SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS,
    SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS,
    SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE,
    SIGNALDESK_COLLECTIONS.AUDIENCE_SEGMENTS,
    SIGNALDESK_COLLECTIONS.AUDIT_EVENTS,
    SIGNALDESK_COLLECTIONS.BUDGET_POLICIES,
    SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES,
    SIGNALDESK_COLLECTIONS.CHANNEL_WINDOW_STATES,
    SIGNALDESK_COLLECTIONS.COMMERCIAL_OFFERS,
    SIGNALDESK_COLLECTIONS.COMMERCIAL_OPPORTUNITIES,
    SIGNALDESK_COLLECTIONS.CONNECTOR_SETTINGS,
    SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES,
    SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES,
    SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES,
    SIGNALDESK_COLLECTIONS.ENRICHMENT_RESULTS,
    SIGNALDESK_COLLECTIONS.ENRICHMENT_WATERFALLS,
    SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES,
    SIGNALDESK_COLLECTIONS.MODEL_EVALS,
    SIGNALDESK_COLLECTIONS.MODEL_ROUTES,
    SIGNALDESK_COLLECTIONS.OPERATING_ENVELOPES,
    SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES,
    SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS,
    SIGNALDESK_COLLECTIONS.PROVIDER_EVALUATIONS,
    SIGNALDESK_COLLECTIONS.PROVIDER_SOURCE_RETENTION,
    SIGNALDESK_COLLECTIONS.REPLY_PLAYBOOKS,
    SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS,
    SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES,
    SIGNALDESK_COLLECTIONS.RUN_TIMELINES,
    SIGNALDESK_COLLECTIONS.SEQUENCER_HANDOFFS,
    SIGNALDESK_COLLECTIONS.SEQUENCER_STEPS,
    SIGNALDESK_COLLECTIONS.SOURCE_QUALITY_SNAPSHOTS,
    SIGNALDESK_COLLECTIONS.STRATEGIST_MEMOS,
    SIGNALDESK_COLLECTIONS.TEAM_MEMBERS,
    SIGNALDESK_COLLECTIONS.TEMPLATE_SUMMARIES,
    SIGNALDESK_COLLECTIONS.TRUST_PARTNER_DEALS,
    SIGNALDESK_COLLECTIONS.TRUST_PARTNER_DELIVERABLES,
    SIGNALDESK_COLLECTIONS.TRUST_PARTNER_METRICS,
    SIGNALDESK_COLLECTIONS.TRUST_PARTNER_NICHE_TESTS,
    SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES,
    SIGNALDESK_COLLECTIONS.TRUST_PARTNER_RENEWAL_DECISIONS,
    SIGNALDESK_COLLECTIONS.VENDOR_RUNS,
    SIGNALDESK_COLLECTIONS.WEBHOOK_EVENTS,
] as const;

export type SignalDeskWorkspaceGenericCollection = typeof SIGNALDESK_WORKSPACE_GENERIC_COLLECTIONS[number];

const collectionSet = new Set<string>(SIGNALDESK_WORKSPACE_GENERIC_COLLECTIONS);
const canonicalIdentifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const canonicalDayPattern = /^\d{4}-\d{2}-\d{2}$/;
const canonicalCurrencyPattern = /^[A-Z]{3}$/;
const canonicalHashPattern = /^[a-f0-9]{64}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxCount = Number.MAX_SAFE_INTEGER;

const fail = (code: string): never => {
    throw new Error(code);
};

const recordValue = (value: unknown, code: string): Record<string, unknown> => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return fail(code);
    return value as Record<string, unknown>;
};

const boundedCleanString = (minimum: number, maximum: number) => z.string()
    .min(minimum)
    .max(maximum)
    .regex(/^[^\u0000-\u001f\u007f]*$/);

const canonicalText = (minimum: number, maximum: number) => boundedCleanString(minimum, maximum)
    .refine((value) => value === value.trim());

const canonicalIdentifier = (minimum = 1, maximum = 180) => boundedCleanString(minimum, maximum)
    .regex(canonicalIdentifierPattern)
    .refine((value) => value === value.trim());

const nullableIdentifier = (minimum = 1, maximum = 180) => canonicalIdentifier(minimum, maximum).nullable().optional();
const nullableText = (maximum: number, minimum = 1) => canonicalText(minimum, maximum).nullable().optional();
const boundedCount = z.number().int().finite().min(0).max(maxCount);
const boundedMoney = z.number().finite().min(0).max(1_000_000_000);
const boundedRate = z.number().finite().min(0).max(1);
const boundedScore = z.number().finite().min(0).max(100);
const boundedPercentage = z.number().finite().min(0).max(100);
const boundedMinorCurrency = z.number().int().finite().min(0).max(1_000_000_000_000);

const uniqueArray = <Item extends z.ZodTypeAny>(schema: Item, maximum: number, minimum = 0) => z.array(schema)
    .min(minimum)
    .max(maximum)
    .superRefine((items, context) => {
        if (new Set(items.map((item) => JSON.stringify(item))).size !== items.length) {
            context.addIssue({ code: z.ZodIssueCode.custom, message: "Array entries must be unique." });
        }
    });

const canonicalDay = boundedCleanString(10, 10).regex(canonicalDayPattern).refine((value) => {
    const parsed = new Date(value + "T00:00:00.000Z");
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});

const canonicalDateTimeText = boundedCleanString(20, 40).datetime({ offset: true }).refine((value) => value === value.trim()).transform((value) => (
    new Date(value).toISOString()
));

const toTimestampIso = (value: unknown): string | null => {
    try {
        if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
        if (typeof value === "string") {
            const parsed = new Date(value);
            return Number.isFinite(parsed.getTime()) && value === parsed.toISOString() ? value : null;
        }
        if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
            const parsed = value.toDate();
            return parsed instanceof Date && Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
        }
        if (typeof value === "object" && value !== null && "seconds" in value && typeof value.seconds === "number") {
            const nanoseconds = "nanoseconds" in value && typeof value.nanoseconds === "number" ? value.nanoseconds : 0;
            if (!Number.isInteger(value.seconds) || !Number.isInteger(nanoseconds) || nanoseconds < 0 || nanoseconds > 999_999_999) {
                return null;
            }
            const parsed = new Date((value.seconds * 1_000) + Math.floor(nanoseconds / 1_000_000));
            return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
        }
    } catch {
        return null;
    }
    return null;
};

const persistedTimestamp = z.unknown().transform((value, context): string => {
    const iso = toTimestampIso(value);
    if (!iso) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Timestamp is invalid." });
        return z.NEVER;
    }
    return iso;
});

const nullableTimestamp = persistedTimestamp.nullable().optional().transform((value) => value ?? null);

const canonicalUrl = canonicalText(8, 500).transform((value, context): string => {
    try {
        const parsed = new URL(value);
        if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || parsed.username || parsed.password) {
            context.addIssue({ code: z.ZodIssueCode.custom, message: "URL must be credential-free HTTP(S)." });
            return z.NEVER;
        }
        parsed.hash = "";
        return parsed.toString();
    } catch {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "URL is invalid." });
        return z.NEVER;
    }
});

const nullableUrl = canonicalUrl.nullable().optional().transform((value) => value ?? null);
const canonicalEmail = boundedCleanString(3, 254).regex(emailPattern)
    .refine((value) => value === value.trim() && value === value.toLowerCase());
const nullableEmail = canonicalEmail.nullable().optional().transform((value) => value ?? null);
const canonicalHash = boundedCleanString(64, 64).regex(canonicalHashPattern);
const canonicalCurrency = boundedCleanString(3, 3).regex(canonicalCurrencyPattern);

const productIdentity = (raw: unknown, documentId: string, identityField: string, expectedDocumentId?: string) => {
    const record = recordValue(raw, "SIGNALDESK_WORKSPACE_DOCUMENT_SHAPE_INVALID");
    if (record.pId !== SIGNALDESK_PRODUCT_CODE) fail("SIGNALDESK_WORKSPACE_PRODUCT_MISMATCH");
    const expectedId = expectedDocumentId || documentId;
    if (record[identityField] !== documentId || documentId !== expectedId) {
        fail("SIGNALDESK_WORKSPACE_DOCUMENT_IDENTITY_MISMATCH");
    }
    return record;
};

interface WorkspaceCollectionProjector {
    readonly identityField: string;
    readonly publicFields: readonly string[];
    project(raw: unknown, documentId: string, currentPeriod?: SignalDeskSpendPeriod): SignalDeskWorkspaceProjection;
}

const objectSchemaFrom = (schema: z.ZodTypeAny): z.AnyZodObject => {
    if (schema instanceof z.ZodEffects) return objectSchemaFrom(schema.innerType());
    if (schema instanceof z.ZodObject) return schema;
    return fail("SIGNALDESK_WORKSPACE_PROJECTOR_SCHEMA_INVALID");
};

const publicFieldsForSchema = (schema: z.ZodTypeAny): readonly string[] => (
    Object.freeze(Object.keys(objectSchemaFrom(schema).shape))
);

const parseWorkspaceProjection = (
    schema: z.ZodTypeAny,
    raw: unknown,
): SignalDeskWorkspaceProjection => schema.parse(raw);

const createProjector = <Key extends WorkspaceProjectedArrayKey>(params: {
    identityField: keyof WorkspaceItem<Key> & string;
    schema: z.ZodTypeAny;
    workspaceKey: Key;
}): WorkspaceCollectionProjector => ({
    identityField: params.identityField,
    publicFields: publicFieldsForSchema(params.schema),
    project: (raw, documentId) => {
        const record = productIdentity(raw, documentId, params.identityField);
        return parseWorkspaceProjection(params.schema, record);
    },
});

const aiTasks = [
    "score", "evidence", "draft", "reply-classification", "approval-packet", "weekly-strategist", "vendor-audit", "quality-critic",
] as const;
const aiVolumeTasks = ["score", "evidence", "draft", "reply-classification"] as const;
const outboundChannels = ["email", "whatsapp", "instagram", "messenger", "manual"] as const;
const providers = [
    "google-places", "foursquare", "apify", "fhrs-fhis", "manual", "owned-email", "apollo", "hunter", "zerobounce",
    "firecrawl", "tavily", "exa", "postmark", "resend", "smartlead", "instantly", "lemlist", "gemini", "openai", "anthropic",
] as const;
const providerUses = ["discovery", "enrichment", "verification", "research", "sender", "sequencer", "ai"] as const;
const controlStatuses = ["active", "inactive", "hold", "blocked"] as const;
const confidenceValues = ["high", "medium", "low"] as const;
const targetSuppressionStatuses = ["clear", "suppressed", "wrong-contact", "complaint"] as const;
const allowedRoutes = ["email-export", "partner-intro", "pod-review", "none"] as const;
const sourcePolicyStates = ["active", "expires_soon", "expired", "review_required"] as const;
const outcomeTypes = ["route_created", "upload_started", "preview_prepared", "published", "two_surface_activation"] as const;

const currentMenuPresenceSchema = z.object({
    assessedAt: canonicalDateTimeText,
    contradictionState: z.enum(["none-recorded", "review-required"]),
    contradictions: uniqueArray(canonicalText(1, 500), 20),
    currentListUrlState: z.enum(["observed", "missing", "unverified"]),
    diagnosticVersion: z.literal("current-menu-presence-v1"),
    mobileAccessState: z.enum(["accessible", "difficult", "unverified"]),
    observedFormat: z.enum(["web-link", "pdf", "social-only", "missing", "unknown"]),
    ownerControlState: z.enum(["verified", "unverified", "not-owner-controlled"]),
    sourceRefs: uniqueArray(canonicalText(1, 500), 20),
    sourceSnapshotAt: canonicalDateTimeText.nullable().optional(),
    truthGap: z.enum(["missing-current-list", "pdf-only", "stale-menu", "instagram-only", "no-link", "owner-control-gap", "unknown"]),
    twoSurfaceFeasibility: z.enum(["ready", "review-required", "blocked"]),
    websiteState: z.enum(["observed", "missing", "unverified"]),
}).superRefine((value, context) => {
    if ((value.contradictionState === "none-recorded") !== (value.contradictions.length === 0)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Contradiction state does not match contradictions." });
    }
    if (value.observedFormat === "missing" && value.currentListUrlState === "observed") {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Missing format cannot have an observed current-list URL." });
    }
});

const activationWatchSchema = z.object({
    activationWatchId: canonicalIdentifier(3, 180),
    deadlineAt: nullableTimestamp,
    lastOutcomeAt: nullableTimestamp,
    nextAction: canonicalText(2, 500),
    outcomeTypes: uniqueArray(z.enum(outcomeTypes), outcomeTypes.length),
    ownerQualifiedAt: nullableTimestamp,
    revenueAccountId: canonicalIdentifier(3, 180),
    source: z.literal("signaldesk-outcome-summaries"),
    status: z.enum(["not-started", "routed", "in-progress", "published", "activated", "stalled"]),
    targetId: canonicalIdentifier(3, 160),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if (value.status === "activated" && (!value.lastOutcomeAt || !value.outcomeTypes.includes("two_surface_activation"))) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Activated watch requires a two-surface outcome." });
    }
    if (value.deadlineAt && value.ownerQualifiedAt && Date.parse(value.deadlineAt) <= Date.parse(value.ownerQualifiedAt)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Activation deadline must follow qualification." });
    }
});

const approvalSchema = z.object({
    approvalId: canonicalIdentifier(3, 180),
    approvalPacketId: nullableIdentifier(3, 180),
    channel: z.enum(outboundChannels),
    draftId: nullableIdentifier(3, 180),
    dueAt: nullableTimestamp,
    priority: z.enum(["low", "normal", "high"]),
    rejectionReason: z.enum(["evidence-weak-or-stale", "identity-uncertain", "no-customer-truth-gap", "contact-route-not-allowed", "already-solved", "wrong-segment", "duplicate", "other"]).nullable().optional(),
    reviewReason: canonicalText(2, 500),
    status: z.enum(["pending", "approved", "rejected", "queued", "exported", "sent", "failed"]),
    targetId: canonicalIdentifier(3, 160),
    targetName: canonicalText(2, 180),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if ((value.status === "rejected") !== Boolean(value.rejectionReason)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Rejection reason does not match approval status." });
    }
    if (["approved", "queued", "exported", "sent"].includes(value.status) && !value.draftId) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Approved delivery state requires a draft." });
    }
});

const approvalPacketSchema = z.object({
    actionFingerprintHash: canonicalHash.nullable().optional(),
    actionVersion: z.literal("signaldesk-action-packet-v1").optional(),
    allowedRoute: z.enum(allowedRoutes).optional(),
    allowedRouteReason: nullableText(500),
    approvalId: nullableIdentifier(3, 180),
    approvalPacketId: canonicalIdentifier(3, 180),
    channel: z.enum(outboundChannels).nullable().optional(),
    channelReadiness: z.enum(["ready", "not_ready", "blocked"]),
    costImpactUsd: boundedMoney.max(10_000),
    ctaFingerprintHash: canonicalHash.nullable().optional(),
    ctaId: nullableIdentifier(1, 180),
    currentMenuPresence: currentMenuPresenceSchema.nullable().optional(),
    draftId: nullableIdentifier(3, 180),
    evidencePacketId: nullableIdentifier(3, 180),
    evidenceRejectedFacts: uniqueArray(canonicalText(1, 500), 20).optional(),
    evidenceSummary: nullableText(1_000),
    expectedOutcome: nullableText(500),
    messageBody: nullableText(5_000),
    messageSubject: nullableText(240),
    recommendedAction: z.enum(["approve", "hold", "reject", "pause", "redirect"]),
    riskSummary: canonicalText(2, 1_000),
    senderDomainFingerprintHash: canonicalHash.nullable().optional(),
    senderDomainId: nullableIdentifier(3, 180),
    sourcePolicyExpiresAt: nullableTimestamp,
    sourcePolicyId: nullableIdentifier(3, 160),
    sourcePolicyState: z.enum(sourcePolicyStates).optional(),
    status: z.enum(["pending", "approved", "rejected", "held"]),
    suppressionStatus: z.enum(targetSuppressionStatuses),
    targetId: canonicalIdentifier(3, 160),
    targetName: canonicalText(2, 180),
    unsupportedClaims: uniqueArray(canonicalText(1, 500), 20).optional(),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    const messagePair = Boolean(value.messageBody) === Boolean(value.messageSubject);
    const ctaPair = Boolean(value.ctaId) === Boolean(value.ctaFingerprintHash);
    const senderPair = Boolean(value.senderDomainId) === Boolean(value.senderDomainFingerprintHash);
    const actionPair = Boolean(value.actionVersion) === Boolean(value.actionFingerprintHash);
    if (!messagePair || !ctaPair || !senderPair || !actionPair) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Approval packet authority fields are incomplete." });
    }
    if (value.recommendedAction === "approve" && (value.allowedRoute === "none" || value.channelReadiness !== "ready" || value.suppressionStatus !== "clear")) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Approved recommendation lacks delivery authority." });
    }
    if (value.status === "approved" && value.recommendedAction !== "approve") {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Approved packet must recommend approval." });
    }
});

const audienceSegmentSchema = z.object({
    audienceSegmentId: canonicalIdentifier(3, 180),
    criteriaSummary: canonicalText(2, 500),
    marketPodId: nullableIdentifier(1, 160),
    name: canonicalText(2, 120),
    sourcePolicyId: nullableIdentifier(1, 160),
    status: z.enum(controlStatuses),
    triggerType: z.enum(["demand-signal", "source-run", "outcome", "manual", "website-evidence"]),
    updatedAt: persistedTimestamp,
});

const auditEventSchema = z.object({
    action: canonicalIdentifier(2, 160),
    actorId: canonicalIdentifier(3, 180),
    actorRole: nullableText(80),
    auditEventId: canonicalIdentifier(3, 180),
    createdAt: persistedTimestamp,
    entityId: nullableIdentifier(1, 180),
    entityType: canonicalIdentifier(2, 120),
    reason: nullableText(1_000),
});

const channelHealthSchema = z.object({
    channel: z.enum(outboundChannels),
    configured: z.boolean(),
    lastError: nullableText(500),
    lastEventAt: nullableTimestamp,
    status: z.enum(["healthy", "paused", "not_configured", "warning"]),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if (value.status === "healthy" && !value.configured) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Healthy channel must be configured." });
    }
    if (value.status === "not_configured" && value.configured) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Not-configured channel cannot be configured." });
    }
});

const channelWindowSchema = z.object({
    channel: z.enum(["whatsapp", "instagram", "messenger"]),
    channelWindowId: canonicalIdentifier(3, 180),
    eligibleForHandoff: z.boolean(),
    expiresAt: nullableTimestamp,
    lastInteractionAt: nullableTimestamp,
    openedAt: nullableTimestamp,
    reason: nullableText(500),
    source: z.enum(["inbound", "opt-in", "ad-click", "template", "manual"]),
    status: z.enum(["open", "closed", "expired", "blocked", "needs-template"]),
    targetId: nullableIdentifier(3, 160),
    targetName: nullableText(180, 2),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if (value.status === "open" && (!value.openedAt || !value.expiresAt || !value.eligibleForHandoff)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Open channel window is incomplete." });
    }
    if (value.status !== "open" && value.eligibleForHandoff) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Closed channel window cannot allow handoff." });
    }
    if (value.openedAt && value.expiresAt && Date.parse(value.expiresAt) <= Date.parse(value.openedAt)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Channel-window expiry must follow opening." });
    }
});

const connectorSchema = z.object({
    accessTokenState: z.enum(["missing", "configured", "not_required"]),
    apiKeyState: z.enum(["missing", "configured", "not_required"]),
    appId: nullableText(180),
    appSecretState: z.enum(["missing", "configured", "not_required"]),
    channel: z.enum(["email", "whatsapp", "instagram", "messenger", "sequencer", "source"]),
    connectorId: canonicalIdentifier(3, 180),
    connectorKind: z.enum(["email-smtp", "meta-whatsapp", "meta-instagram", "meta-messenger", "smartlead", "apify"]),
    displayName: canonicalText(2, 180),
    envReadiness: z.enum(["ready", "partial", "missing"]),
    fromName: nullableText(180),
    instagramPageId: nullableIdentifier(1, 180),
    messengerPageId: nullableIdentifier(1, 180),
    missingEnv: uniqueArray(canonicalText(1, 180), 20),
    notes: nullableText(500),
    phoneNumber: nullableText(40),
    phoneNumberId: nullableIdentifier(1, 180),
    provider: z.enum(["owned-email", "smtp", "meta", "smartlead", "apify"]),
    replyToEmail: nullableEmail,
    senderDomain: nullableText(253),
    senderEmail: nullableEmail,
    smtpCredentialState: z.enum(["missing", "configured", "not_required"]),
    status: z.enum(controlStatuses),
    updatedAt: persistedTimestamp,
    webhookSecretState: z.enum(["missing", "configured", "not_required"]),
}).superRefine((value, context) => {
    const expected = value.connectorKind === "email-smtp"
        ? ["email", "smtp"]
        : value.connectorKind === "smartlead"
            ? ["sequencer", "smartlead"]
            : value.connectorKind === "apify"
                ? ["source", "apify"]
                : value.connectorKind === "meta-whatsapp"
                    ? ["whatsapp", "meta"]
                    : value.connectorKind === "meta-instagram"
                        ? ["instagram", "meta"]
                        : ["messenger", "meta"];
    if (value.channel !== expected[0] || value.provider !== expected[1]) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Connector kind does not match provider/channel." });
    }
    if ((value.envReadiness === "ready") !== (value.missingEnv.length === 0)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Connector readiness does not match missing environment fields." });
    }
});

const demandSignalSchema = z.object({
    count: boundedCount,
    day: canonicalDay,
    demandSignalId: canonicalIdentifier(3, 300),
    signalType: z.enum(["qr_scan", "link_click", "share", "claim_attempt", "referral"]),
    sourceSurface: z.enum(["menu", "qr", "website", "manual", "other"]),
    targetId: nullableIdentifier(3, 160),
    targetName: nullableText(180, 2),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if (Boolean(value.targetId) !== Boolean(value.targetName)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Demand target identity is incomplete." });
    }
});

const draftSchema = z.object({
    approvalId: nullableIdentifier(3, 180),
    body: canonicalText(2, 5_000),
    channel: z.enum(outboundChannels),
    ctaFingerprintHash: canonicalHash.nullable().optional(),
    ctaId: nullableIdentifier(1, 180),
    draftId: canonicalIdentifier(3, 180),
    evidencePacketId: nullableIdentifier(3, 180),
    personalizationEvidenceIds: uniqueArray(canonicalIdentifier(1, 500), 30).optional(),
    senderDomainFingerprintHash: canonicalHash.nullable().optional(),
    senderDomainId: nullableIdentifier(3, 180),
    status: z.enum(["draft", "queued", "approved", "rejected", "exported", "sent", "failed"]),
    subject: canonicalText(1, 240),
    targetId: canonicalIdentifier(3, 160),
    targetName: canonicalText(2, 180),
    templateFingerprintHash: canonicalHash.nullable().optional(),
    templateId: canonicalIdentifier(3, 160),
    unsupportedClaims: uniqueArray(canonicalText(1, 500), 20).optional(),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if (Boolean(value.ctaId) !== Boolean(value.ctaFingerprintHash) || Boolean(value.senderDomainId) !== Boolean(value.senderDomainFingerprintHash)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Draft authority lineage is incomplete." });
    }
    if (["approved", "queued", "exported", "sent"].includes(value.status) && (!value.approvalId || !value.evidencePacketId)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Approved draft state lacks approval/evidence authority." });
    }
});

const enrichmentResultSchema = z.object({
    confidence: z.enum(confidenceValues),
    enrichmentResultId: canonicalIdentifier(3, 180),
    expiresAt: nullableTimestamp,
    field: canonicalIdentifier(1, 80),
    provider: z.enum(providers),
    sourcePolicyId: nullableIdentifier(3, 160),
    status: z.enum(["verified", "candidate", "blocked", "missing"]),
    targetId: canonicalIdentifier(3, 160),
    targetName: canonicalText(2, 180),
    updatedAt: persistedTimestamp,
    valuePreview: nullableText(180),
}).superRefine((value, context) => {
    if ((value.status === "verified" || value.status === "candidate") && (!value.valuePreview || !value.sourcePolicyId || !value.expiresAt)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Usable enrichment lacks source authority or expiry." });
    }
    if ((value.status === "blocked" || value.status === "missing") && value.valuePreview) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Blocked enrichment cannot expose a value preview." });
    }
});

const enrichmentWaterfallSchema = z.object({
    maxCostUsd: boundedMoney.max(1_000),
    maxCredits: z.number().int().finite().min(1).max(50),
    name: canonicalText(2, 120),
    providerOrder: uniqueArray(z.enum(providers), 12, 1),
    requestedField: z.enum(["email", "phone", "company", "website", "evidence"]),
    retentionDays: z.number().int().finite().min(1).max(365),
    sourcePolicyId: nullableIdentifier(1, 160),
    status: z.enum(controlStatuses),
    stopCondition: z.enum(["first-verified", "first-candidate", "manual-review"]),
    updatedAt: persistedTimestamp,
    verificationRequired: z.boolean(),
    waterfallId: canonicalIdentifier(3, 180),
}).superRefine((value, context) => {
    if (value.stopCondition === "first-verified" && !value.verificationRequired) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Verified stop condition requires verification." });
    }
});

const evidencePacketSchema = z.object({
    allowedUse: uniqueArray(canonicalText(1, 120), 20),
    confidence: z.enum(confidenceValues),
    currentMenuPresence: currentMenuPresenceSchema.optional(),
    evidencePacketId: canonicalIdentifier(3, 180),
    rejectedFacts: uniqueArray(canonicalText(1, 500), 20),
    summary: canonicalText(2, 2_000),
    targetId: canonicalIdentifier(3, 160),
    targetName: canonicalText(2, 180),
    updatedAt: persistedTimestamp,
});

const modelRouteSchema = z.object({
    confidenceThreshold: z.enum(confidenceValues),
    defaultModel: canonicalText(2, 120),
    defaultProvider: z.enum(["gemini", "openai", "anthropic"]),
    escalationModel: nullableText(120, 2),
    escalationProvider: z.enum(["gemini", "openai", "anthropic"]).nullable().optional(),
    maxCostUsd: boundedMoney.max(100),
    modelRouteId: canonicalIdentifier(3, 180),
    status: z.enum(controlStatuses),
    task: z.enum(aiTasks),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if (Boolean(value.escalationProvider) !== Boolean(value.escalationModel)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Escalation provider/model must be paired." });
    }
    if (value.modelRouteId !== "model_route_" + value.task) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Model-route identity does not match task." });
    }
});

const modelEvalSchema = z.object({
    acceptanceRate: boundedRate.optional(),
    acceptedCount: boundedCount.optional(),
    editRate: boundedRate,
    editedCount: boundedCount.optional(),
    founderAttentionMinutes: boundedCount.max(1_000_000).optional(),
    heldCount: boundedCount.optional(),
    holdRate: boundedRate.optional(),
    legacyPassRate: boundedRate.optional(),
    legacyRejectedFactRate: boundedRate.optional(),
    legacySampleSize: boundedCount.optional(),
    lowConfidenceCount: boundedCount.optional(),
    measurementVersion: z.literal("cumulative-v1").optional(),
    model: canonicalText(2, 120),
    modelEvalId: canonicalIdentifier(3, 180),
    modelRouteId: nullableIdentifier(3, 180),
    passRate: boundedRate,
    passedSampleCount: boundedCount.optional(),
    provider: z.enum(providers),
    rejectedCount: boundedCount.optional(),
    rejectedFactRate: boundedRate,
    rejectedFactSampleCount: boundedCount.optional(),
    rejectionRate: boundedRate.optional(),
    reviewedSampleSize: boundedCount.optional(),
    sampleSize: boundedCount,
    status: z.enum(["passed", "failed", "needs-review"]),
    task: z.enum(aiTasks),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    for (const count of [value.passedSampleCount, value.lowConfidenceCount, value.rejectedFactSampleCount, value.reviewedSampleSize]) {
        if (count !== undefined && count > value.sampleSize) {
            context.addIssue({ code: z.ZodIssueCode.custom, message: "Model-eval count exceeds sample size." });
        }
    }
    const reviewedTotal = (value.acceptedCount || 0) + (value.editedCount || 0) + (value.rejectedCount || 0) + (value.heldCount || 0);
    if (value.reviewedSampleSize !== undefined && reviewedTotal > value.reviewedSampleSize) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Model-eval decisions exceed reviewed sample size." });
    }
});

const commercialOfferSchema = z.object({
    allowedDiscountBps: z.number().int().finite().min(0).max(10_000),
    billingCadence: z.enum(["one-time", "monthly", "annual"]),
    commercialOfferId: canonicalIdentifier(3, 180),
    contents: uniqueArray(canonicalText(1, 500), 30, 1),
    currency: canonicalCurrency,
    eligibilitySummary: canonicalText(2, 1_000),
    founderApprovalConditions: uniqueArray(canonicalText(1, 500), 30),
    name: canonicalText(2, 180),
    offerCtaId: nullableIdentifier(1, 180),
    priceMinor: boundedMinorCurrency,
    status: z.enum(controlStatuses),
    updatedAt: persistedTimestamp,
    version: z.number().int().finite().min(1).max(1_000_000),
});

const commercialOpportunitySchema = z.object({
    commercialOfferId: nullableIdentifier(3, 180),
    currency: canonicalCurrency.nullable().optional(),
    expectedCloseAt: nullableTimestamp,
    founderAttentionMinutes: boundedCount.max(1_000_000),
    nextAction: canonicalText(2, 500),
    nextActionDueAt: nullableTimestamp,
    opportunityId: canonicalIdentifier(3, 180),
    probabilityPercent: boundedPercentage,
    revenueAccountId: canonicalIdentifier(3, 180),
    stage: z.enum(["qualified", "discovery", "offer", "decision", "won", "lost", "nurture"]),
    stalledReason: nullableText(500),
    status: z.enum(["open", "won", "lost", "nurture"]),
    targetId: canonicalIdentifier(3, 160),
    title: canonicalText(2, 240),
    updatedAt: persistedTimestamp,
    valueMinor: boundedMinorCurrency,
    winLossReason: nullableText(500),
}).superRefine((value, context) => {
    const expectedStatus = value.stage === "won" ? "won" : value.stage === "lost" ? "lost" : value.stage === "nurture" ? "nurture" : "open";
    if (value.status !== expectedStatus) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Commercial stage/status are inconsistent." });
    }
    if ((value.valueMinor > 0) !== Boolean(value.currency)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Opportunity currency does not match value." });
    }
    if (value.stage === "offer" || value.stage === "decision") {
        if (!value.commercialOfferId) context.addIssue({ code: z.ZodIssueCode.custom, message: "Advanced opportunity lacks offer authority." });
    }
    if (
        value.stage === "won"
        && !value.commercialOfferId
        && (
            value.valueMinor !== 0
            || (value.winLossReason !== "Existing two-surface activation outcome."
                && value.winLossReason !== "Two-surface activation outcome recorded.")
        )
    ) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Offerless win lacks zero-value activation authority." });
    }
});

const operatingEnvelopeSchema = z.object({
    approvalMode: z.enum(["manual", "recommendation-only", "prepare-and-approve-each", "approve-batch", "approve-sample", "exception-only"]),
    approvedAt: nullableTimestamp,
    approvedBy: nullableIdentifier(3, 180),
    budgetPolicyId: nullableIdentifier(3, 180),
    channel: z.enum(["email", "manual", "content", "partner", "referral"]),
    commercialOfferId: canonicalIdentifier(3, 180),
    dailyVolumeCap: z.number().int().finite().min(0).max(100_000),
    executionState: z.enum(["shadow", "approval-only", "held", "paused"]),
    expiresAt: persistedTimestamp,
    fallbackAction: z.enum(["hold", "pause", "founder-review"]),
    marketPodId: nullableIdentifier(3, 180),
    maxCostUsd: boundedMoney.max(10_000_000),
    name: canonicalText(2, 180),
    operatingEnvelopeId: canonicalIdentifier(3, 180),
    requestedApprovalMode: z.enum(["manual", "recommendation-only", "prepare-and-approve-each", "approve-batch", "approve-sample", "exception-only"]),
    senderDomainId: nullableIdentifier(3, 180),
    sourcePolicyIds: uniqueArray(canonicalIdentifier(3, 160), 30, 1),
    startsAt: persistedTimestamp,
    status: z.enum(["draft", "shadow", "approved", "held", "paused", "expired"]),
    stopConditions: uniqueArray(canonicalText(2, 500), 30, 1),
    templateIds: uniqueArray(canonicalIdentifier(3, 160), 30),
    totalVolumeCap: z.number().int().finite().min(0).max(10_000_000),
    updatedAt: persistedTimestamp,
    version: z.number().int().finite().min(1).max(1_000_000),
}).superRefine((value, context) => {
    if (Date.parse(value.expiresAt) <= Date.parse(value.startsAt)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Operating envelope expiry must follow start." });
    }
    if (value.dailyVolumeCap > value.totalVolumeCap) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Daily volume exceeds total volume." });
    }
    const approvalIdentityComplete = Boolean(value.approvedAt && value.approvedBy);
    if (Boolean(value.approvedAt) !== Boolean(value.approvedBy)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Operating envelope approval identity is incomplete." });
    }
    if (value.status === "approved" && !approvalIdentityComplete) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Approved operating envelope lacks approval identity." });
    }
    if (approvalIdentityComplete && value.approvalMode !== value.requestedApprovalMode) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Approved envelope mode differs from requested mode." });
    }
    if (value.channel === "email" && (!value.senderDomainId || value.templateIds.length === 0)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Email envelope lacks sender/template authority." });
    }
});

const revenueAccountSchema = z.object({
    activationState: z.enum(["not-started", "routed", "in-progress", "stalled", "activated"]),
    automationState: z.enum(["manual", "shadow", "approval-only", "paused"]),
    category: nullableText(120),
    city: nullableText(120),
    complianceState: z.enum(["eligible", "review-required", "blocked", "suppressed"]),
    country: nullableText(120),
    displayName: canonicalText(2, 180),
    engagementState: z.enum(["none", "contactable", "contacted", "replied", "waiting-for-customer", "opted-out"]),
    lifecycleStage: z.enum(["prospect", "engaged", "opportunity", "customer", "nurture", "lost"]),
    locationType: z.enum(["single-location", "headquarters", "branch"]),
    nextAction: canonicalText(2, 500),
    organizationId: canonicalIdentifier(3, 180),
    primaryTargetId: canonicalIdentifier(3, 160),
    revenueAccountId: canonicalIdentifier(3, 180),
    targetIds: uniqueArray(canonicalIdentifier(3, 160), 100, 1),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if (!value.targetIds.includes(value.primaryTargetId)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Revenue account primary target is not linked." });
    }
    if (value.lifecycleStage === "customer" && value.activationState !== "activated") {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Customer account must be activated." });
    }
    if ((value.complianceState === "blocked" || value.complianceState === "suppressed") && value.automationState !== "paused" && value.engagementState !== "opted-out") {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Blocked account is not held from engagement." });
    }
});

const revenueControlSchema = z.object({
    activatedAccountCount: boundedCount,
    founderAttentionMinutes: boundedCount.max(100_000_000),
    lostOpportunityCount: boundedCount,
    openOpportunityCount: boundedCount,
    pipelineCurrency: canonicalCurrency.nullable().optional(),
    pipelineValueMinor: boundedMinorCurrency,
    revenueAccountCount: boundedCount,
    stalledActivationCount: boundedCount,
    updatedAt: persistedTimestamp,
    weightedPipelineValueMinor: boundedMinorCurrency,
    wonOpportunityCount: boundedCount,
}).superRefine((value, context) => {
    if (value.activatedAccountCount > value.revenueAccountCount || value.stalledActivationCount > value.revenueAccountCount) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Revenue-control account counts are inconsistent." });
    }
    if (value.weightedPipelineValueMinor > value.pipelineValueMinor) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Weighted pipeline exceeds pipeline value." });
    }
    if (value.pipelineValueMinor > 0 && !value.pipelineCurrency) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Positive pipeline value lacks currency." });
    }
});

const templateSchema = z.object({
    approvedVariables: uniqueArray(canonicalIdentifier(1, 80), 30),
    body: canonicalText(2, 5_000),
    channel: z.enum(outboundChannels),
    name: canonicalText(2, 120),
    status: z.enum(["active", "inactive"]),
    subject: nullableText(240),
    templateId: canonicalIdentifier(3, 160),
    updatedAt: persistedTimestamp,
});

const runTimelineStepSchema = z.object({
    at: nullableTimestamp,
    label: canonicalText(1, 500),
    status: z.enum(["completed", "blocked", "held", "ready"]),
});

const runTimelineSchema = z.object({
    entityId: canonicalIdentifier(1, 180),
    entityType: z.enum(["target", "source-run", "approval", "provider", "model", "market-pod", "channel-window", "trust-partner", "content", "mission", "experiment", "source-quality", "research", "revenue-account", "commercial-opportunity", "commercial-offer", "operating-envelope", "activation-watch"]),
    label: canonicalText(2, 500),
    runTimelineId: canonicalIdentifier(3, 180),
    status: z.enum(["completed", "blocked", "held", "ready"]),
    steps: z.array(runTimelineStepSchema).min(1).max(30),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if (value.status === "completed" && value.steps.some((step) => step.status !== "completed")) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Completed timeline contains unfinished steps." });
    }
});

const replyPlaybookSchema = z.object({
    approvedReply: canonicalText(5, 1_000),
    escalationRequired: z.boolean(),
    intent: z.enum(["send-details", "pricing", "who-are-you", "not-now", "wrong-person", "stop", "call-me", "interested", "other"]),
    nextRoute: z.enum(["self-serve-preview", "manual-reply", "suppress", "schedule-follow-up", "founder-review"]),
    playbookId: canonicalIdentifier(3, 180),
    status: z.enum(controlStatuses),
    suppressionRequired: z.boolean(),
    title: canonicalText(2, 160),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if ((value.intent === "stop") !== (value.suppressionRequired && value.nextRoute === "suppress")) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Stop playbook must be suppression-only." });
    }
});

const sourceQualitySchema = z.object({
    activationRate: boundedRate,
    complaintOrBounceRisk: z.enum(["low", "medium", "high"]),
    duplicateRate: boundedRate,
    evidenceQualityScore: boundedScore,
    recommendation: z.enum(["continue", "narrow", "refresh", "stop", "needs-policy"]),
    sourceName: canonicalText(2, 180),
    sourcePolicyId: nullableIdentifier(3, 160),
    sourceQualitySnapshotId: canonicalIdentifier(3, 180),
    sourceRunId: nullableIdentifier(3, 160),
    targetCount: boundedCount,
    updatedAt: persistedTimestamp,
    usableTargetRate: boundedRate,
}).superRefine((value, context) => {
    if (!value.sourcePolicyId && value.recommendation !== "needs-policy") {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Unowned source quality must require policy." });
    }
});

const strategistMemoSchema = z.object({
    costSummary: canonicalText(2, 1_000),
    nextDecisions: uniqueArray(canonicalText(2, 500), 20),
    providerQualitySummary: canonicalText(2, 1_000),
    recommendedMarketPodId: nullableIdentifier(3, 180),
    riskNotes: uniqueArray(canonicalText(2, 500), 20),
    status: z.enum(["ready", "held"]),
    strategistMemoId: canonicalIdentifier(3, 180),
    summary: canonicalText(2, 2_000),
    title: canonicalText(2, 180),
    updatedAt: persistedTimestamp,
    weekStart: canonicalDay.refine((value) => {
        const parsed = new Date(value + "T00:00:00.000Z");
        return Number.isFinite(parsed.getTime()) && parsed.getUTCDay() === 1;
    }),
});

const providerEvaluationSchema = z.object({
    accountingMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    blockedRate: boundedRate,
    costPerUsefulResultUsd: boundedMoney.max(1_000_000),
    evidenceQualityScore: boundedScore,
    provider: z.enum(providers),
    providerEvaluationId: canonicalIdentifier(3, 180),
    populationTruncated: z.boolean(),
    recommendation: z.enum(["approve", "hold", "reject", "test-more"]),
    replyOutcomeScore: boundedScore,
    sampleSize: boundedCount,
    status: z.enum(["passed", "failed", "needs-review", "blocked"]),
    suppressionRisk: z.enum(["low", "medium", "high"]),
    updatedAt: persistedTimestamp,
    use: z.enum(providerUses),
    verifiedContactRate: boundedRate,
}).superRefine((value, context) => {
    if (value.sampleSize === 0 && value.recommendation !== "test-more" && value.recommendation !== "hold") {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Empty provider evaluation must request more testing." });
    }
    if (value.status === "blocked" && value.recommendation === "approve") {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Blocked provider cannot be approved." });
    }
});

const providerRetentionSchema = z.object({
    lastRefreshedAt: nullableTimestamp,
    provider: z.enum(["google-places", "apify", "fhrs-fhis"]),
    providerRecordId: nullableText(240),
    providerRecordUrl: nullableUrl,
    providerSourceRetentionId: canonicalIdentifier(3, 180),
    rawPayloadStored: z.literal(false),
    refreshDueAt: nullableTimestamp,
    retentionExpiresAt: nullableTimestamp,
    sourcePolicyId: nullableIdentifier(3, 160),
    sourceRunId: nullableIdentifier(3, 160),
    status: z.enum(["active", "refresh-due", "refreshed", "expired", "blocked"]),
    targetId: nullableIdentifier(3, 160),
    targetName: nullableText(180, 2),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    const usable = value.status === "active" || value.status === "refresh-due" || value.status === "refreshed";
    if (!value.sourcePolicyId || !value.sourceRunId || !value.retentionExpiresAt || (usable && !value.providerRecordId && !value.providerRecordUrl)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Provider retention lacks source lineage." });
    }
    if (Boolean(value.targetId) !== Boolean(value.targetName)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Provider retention target identity is incomplete." });
    }
    if (value.status === "refreshed" && !value.lastRefreshedAt) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Refreshed retention lacks refresh time." });
    }
    if (value.status === "expired" && value.retentionExpiresAt && Date.parse(value.retentionExpiresAt) > Date.now()) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Future retention cannot be expired." });
    }
});

const vendorRunSchema = z.object({
    blockedReason: nullableText(500),
    costEstimateUsd: boundedMoney.max(1_000_000),
    provider: z.enum(providers),
    requestedField: nullableText(80),
    resultCount: boundedCount,
    status: z.enum(["ready", "blocked", "skipped", "completed", "failed"]),
    targetId: nullableIdentifier(3, 160),
    targetName: nullableText(180, 2),
    updatedAt: persistedTimestamp,
    vendorRunId: canonicalIdentifier(3, 180),
    waterfallId: nullableIdentifier(3, 180),
}).superRefine((value, context) => {
    if (Boolean(value.targetId) !== Boolean(value.targetName)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Vendor run target identity is incomplete." });
    }
    if ((value.status === "blocked" || value.status === "failed") !== Boolean(value.blockedReason)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Vendor failure reason does not match status." });
    }
    if (value.status !== "completed" && value.resultCount > 0) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Incomplete vendor run cannot report results." });
    }
});

const providerEventSchema = z.object({
    channel: z.enum(outboundChannels).nullable().optional(),
    direction: z.enum(["inbound", "source", "status"]).optional(),
    eventId: canonicalIdentifier(3, 180),
    eventType: canonicalIdentifier(2, 180),
    occurredAt: nullableTimestamp,
    provider: canonicalIdentifier(2, 80),
    providerMessageId: nullableText(998),
    status: z.enum(["received", "processed", "ignored", "blocked", "failed"]),
    targetId: nullableIdentifier(3, 160),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if (value.direction === "inbound" && (!value.channel || !value.occurredAt)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Inbound provider event lacks channel/time." });
    }
    if (value.direction === "source" && value.channel && value.channel !== "manual") {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Source event cannot claim an outbound channel." });
    }
});

const sequencerHandoffSchema = z.object({
    approvalId: nullableIdentifier(3, 180),
    blockedReason: nullableText(500),
    ctaFingerprintHash: canonicalHash.nullable().optional(),
    ctaId: nullableIdentifier(1, 180),
    currentStep: z.number().int().finite().min(1).max(100).nullable().optional(),
    nextSendAt: nullableTimestamp,
    provider: z.enum(["owned-email", "smartlead", "instantly", "lemlist"]),
    providerCampaignId: nullableIdentifier(1, 240),
    providerLeadId: nullableIdentifier(1, 240),
    recipientPreview: nullableText(180),
    senderDomainFingerprintHash: canonicalHash.nullable().optional(),
    senderDomainId: nullableIdentifier(3, 180),
    sequencerHandoffId: canonicalIdentifier(3, 180),
    status: z.enum(["blocked", "ready", "queued", "exported", "sent", "stopped", "failed"]),
    stepCount: z.number().int().finite().min(1).max(100).nullable().optional(),
    targetId: nullableIdentifier(3, 160),
    targetName: nullableText(180, 2),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if (Boolean(value.targetId) !== Boolean(value.targetName)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Sequencer target identity is incomplete." });
    }
    if (Boolean(value.ctaId) !== Boolean(value.ctaFingerprintHash) || Boolean(value.senderDomainId) !== Boolean(value.senderDomainFingerprintHash)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Sequencer authority lineage is incomplete." });
    }
    if (value.status === "blocked" || value.status === "failed") {
        if (!value.blockedReason) context.addIssue({ code: z.ZodIssueCode.custom, message: "Blocked sequencer handoff lacks reason." });
    } else if (value.blockedReason) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Ready sequencer handoff retains a blocked reason." });
    }
    if (value.provider === "owned-email" && (value.status === "ready" || value.status === "queued") && (!value.currentStep || !value.stepCount || !value.nextSendAt)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Owned sequencer handoff lacks step scheduling." });
    }
    if (value.currentStep && value.stepCount && value.currentStep > value.stepCount) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Sequencer current step exceeds step count." });
    }
});

const sequencerStepSchema = z.object({
    approvalId: nullableIdentifier(3, 180),
    bodyPreview: canonicalText(1, 180),
    channel: z.literal("email"),
    ctaFingerprintHash: canonicalHash.nullable().optional(),
    ctaId: nullableIdentifier(1, 180),
    draftId: nullableIdentifier(3, 180),
    scheduledAt: nullableTimestamp,
    senderDomainId: nullableIdentifier(3, 180),
    sentAt: nullableTimestamp,
    sequenceStepId: canonicalIdentifier(3, 180),
    sequencerHandoffId: canonicalIdentifier(3, 180),
    status: z.enum(["blocked", "queued", "ready", "sent", "skipped", "failed"]),
    stepNumber: z.number().int().finite().min(1).max(100),
    subject: canonicalText(1, 240),
    targetId: nullableIdentifier(3, 160),
    targetName: nullableText(180, 2),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if (Boolean(value.targetId) !== Boolean(value.targetName) || Boolean(value.ctaId) !== Boolean(value.ctaFingerprintHash)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Sequence-step lineage is incomplete." });
    }
    if ((value.status === "sent") !== Boolean(value.sentAt)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Sequence-step sent time does not match status." });
    }
    if ((value.status === "ready" || value.status === "queued") && !value.scheduledAt) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Queued sequence step lacks schedule." });
    }
    if (value.sentAt && value.scheduledAt && Date.parse(value.sentAt) < Date.parse(value.scheduledAt)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Sequence step was sent before schedule." });
    }
});

const teamMemberSchema = z.object({
    active: z.boolean(),
    createdAt: persistedTimestamp,
    createdBy: canonicalIdentifier(3, 180),
    email: canonicalEmail,
    emailLower: canonicalEmail,
    name: nullableText(180, 2),
    permissions: uniqueArray(z.enum([
        "signaldesk.view", "signaldesk.configure", "target.review", "contact.reveal", "draft.create", "draft.approve",
        "message.export", "message.send", "source.configure", "channel.configure", "policy.approve", "kill-switch.activate",
        "kill-switch.deactivate", "audit.view",
    ]), 14),
    role: z.enum(["founder-admin", "growth-manager", "operator", "compliance-reviewer", "readonly-analyst", "system-worker"]),
    status: z.enum(["active", "inactive"]),
    teamMemberId: canonicalIdentifier(3, 180),
    updatedAt: persistedTimestamp,
    updatedBy: canonicalIdentifier(3, 180),
    userId: nullableIdentifier(3, 180),
}).superRefine((value, context) => {
    if (value.email !== value.emailLower || value.active !== (value.status === "active")) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Team-member normalized identity/status mismatch." });
    }
    if (value.role === "system-worker" && value.permissions.length > 0) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "System worker cannot hold human workspace permissions." });
    }
});

const trustPartnerProfileSchema = z.object({
    audienceFitScore: boundedScore,
    baselineReachScore: boundedScore,
    believableUsageScore: boundedScore,
    channel: z.enum(["instagram", "youtube", "tiktok", "linkedin", "newsletter", "community", "offline", "other"]),
    commentQualityScore: boundedScore,
    displayName: canonicalText(2, 180),
    geography: nullableText(180),
    partnerId: canonicalIdentifier(3, 180),
    partnerType: z.enum(["restaurant-consultant", "menu-photographer", "local-business-creator", "agency-freelancer", "pos-payment-partner", "operator-advocate", "generic-creator"]),
    sourceNotes: canonicalText(2, 1_000),
    status: z.enum(["candidate", "approved", "hold", "rejected", "active"]),
    trustFeelScore: boundedScore,
    trustScore: boundedScore,
    updatedAt: persistedTimestamp,
});

const trustPartnerNicheTestSchema = z.object({
    angle: canonicalText(2, 500),
    intendedAttempts: z.number().int().finite().min(1).max(100_000),
    marketPodId: nullableIdentifier(3, 180),
    nicheName: canonicalText(2, 180),
    nicheTestId: canonicalIdentifier(3, 180),
    partnerCount: boundedCount,
    recommendation: z.enum(["continue", "hold", "cut", "underpowered"]),
    status: z.enum(["planned", "active", "paused", "completed"]),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if (value.partnerCount === 0 && value.recommendation !== "underpowered") {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Empty niche test must be underpowered." });
    }
});

const trustPartnerDealSchema = z.object({
    approvalStatus: z.enum(["pending", "approved", "rejected", "blocked"]),
    budgetPolicyId: nullableIdentifier(3, 180),
    budgetReservationAccountingDay: canonicalDay.nullable().optional(),
    budgetReservationAccountingMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable().optional(),
    budgetReservationAmountUsd: boundedMoney.max(10_000_000).nullable().optional(),
    budgetReservationAt: persistedTimestamp.nullable().optional(),
    budgetReservationState: z.enum(["reserved", "legacy-assumed-reserved"]).nullable().optional(),
    dealId: canonicalIdentifier(3, 180),
    deliverableCount: boundedCount,
    dueDate: canonicalDay.nullable().optional(),
    flatFeeUsd: boundedMoney.max(10_000_000),
    nicheTestId: nullableIdentifier(3, 180),
    partnerId: canonicalIdentifier(3, 180),
    partnerName: canonicalText(2, 180),
    paymentState: z.enum(["not_due", "pending", "paid", "held"]),
    pricingModel: z.enum(["flat-fee", "per-view", "barter"]),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if (value.pricingModel === "barter" && value.flatFeeUsd !== 0) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Barter deal cannot have a flat fee." });
    }
    if ((value.paymentState === "paid" || value.paymentState === "pending") && value.approvalStatus !== "approved") {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Unapproved deal cannot progress payment." });
    }
    if (value.flatFeeUsd > 0 && !value.budgetPolicyId) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Paid deal lacks budget policy." });
    }
    if (value.budgetReservationState === "reserved" && (
        !value.budgetReservationAccountingDay
        || !value.budgetReservationAccountingMonth
        || value.budgetReservationAmountUsd === null
        || value.budgetReservationAmountUsd === undefined
        || !value.budgetReservationAt
    )) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Reserved deal lacks accounting evidence." });
    }
});

const trustPartnerDeliverableSchema = z.object({
    dealId: nullableIdentifier(3, 180),
    deliverableId: canonicalIdentifier(3, 180),
    disclosurePresent: z.boolean(),
    dueDate: canonicalDay.nullable().optional(),
    partnerId: canonicalIdentifier(3, 180),
    postUrl: nullableUrl,
    reviewState: z.enum(["pending", "approved", "risk", "rejected"]),
    status: z.enum(["scheduled", "submitted", "live", "missed", "paused"]),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if (value.status === "live" && (!value.postUrl || value.reviewState !== "approved" || !value.disclosurePresent)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Live deliverable lacks approved disclosure/publication proof." });
    }
});

const trustPartnerMetricSchema = z.object({
    activations: boundedCount,
    capturedAt: persistedTimestamp,
    commentQuality: z.enum(confidenceValues),
    comments: boundedCount,
    currentListSubmissions: boundedCount,
    deliverableId: nullableIdentifier(3, 180),
    metricsId: canonicalIdentifier(3, 180),
    ownerLeads: boundedCount,
    partnerId: canonicalIdentifier(3, 180),
    views: boundedCount,
}).superRefine((value, context) => {
    if (value.comments > value.views || value.activations > value.ownerLeads + value.currentListSubmissions) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Trust-partner metrics are internally inconsistent." });
    }
});

const trustPartnerRenewalSchema = z.object({
    createdAt: persistedTimestamp,
    decisionId: canonicalIdentifier(3, 180),
    evidenceSummary: canonicalText(2, 1_000),
    nicheTestId: nullableIdentifier(3, 180),
    ownerDecision: z.enum(["approved", "rejected", "pending"]).nullable().optional(),
    partnerId: canonicalIdentifier(3, 180),
    recommendation: z.enum(["renew", "hold", "cut", "retest"]),
    updatedAt: persistedTimestamp,
}).superRefine((value, context) => {
    if (value.ownerDecision === "approved" && value.recommendation !== "renew" && value.recommendation !== "retest") {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Approved renewal decision conflicts with recommendation." });
    }
});

const aiWorkerSchema = z.object({
    aiRunId: canonicalIdentifier(3, 180),
    confidence: z.enum(confidenceValues),
    costEstimate: boundedMoney.max(1_000_000),
    createdAt: persistedTimestamp,
    criticConfidence: z.enum(confidenceValues).nullable().optional(),
    criticModel: nullableText(120, 2),
    criticRejectedFactCount: boundedCount.optional(),
    criticVerdict: z.enum(["pass", "revise", "hold"]).nullable().optional(),
    escalated: z.boolean().optional(),
    escalationBlocked: z.boolean().optional(),
    escalationModel: nullableText(120, 2),
    founderAttentionMinutes: boundedCount.max(1_000_000).optional(),
    model: canonicalText(2, 120),
    modelCallCount: z.number().int().finite().min(1).max(20).optional(),
    modelEvalId: nullableIdentifier(3, 180),
    modelRouteId: nullableIdentifier(3, 180),
    provider: z.enum(["gemini", "openai", "anthropic"]).nullable().optional(),
    rejectedFactCount: boundedCount.optional(),
    reviewDecision: z.enum(["accepted", "edited", "rejected", "held"]).nullable().optional(),
    reviewReason: nullableText(500),
    reviewedAt: nullableTimestamp,
    reviewedBy: nullableIdentifier(3, 180),
    targetId: canonicalIdentifier(3, 160),
    task: z.enum(aiTasks).nullable().optional(),
    volumeRunId: nullableIdentifier(3, 180),
    workerType: canonicalIdentifier(3, 180),
    workerVersion: canonicalText(2, 240),
}).superRefine((value, context) => {
    if (!value.workerType.startsWith("ai_assist_") || !value.task || value.workerType !== "ai_assist_" + value.task) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "AI worker type does not match task." });
    }
    if (!value.provider || !value.modelRouteId || !value.modelEvalId) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "AI worker lacks model authority." });
    }
    const reviewed = Boolean(value.reviewDecision);
    if (reviewed !== Boolean(value.reviewedAt && value.reviewedBy)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "AI review identity is incomplete." });
    }
    if (reviewed && value.reviewDecision !== "accepted" && !value.reviewReason) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Non-accept AI review requires reason." });
    }
    if (value.escalated && value.escalationBlocked) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "AI escalation cannot be both completed and blocked." });
    }
});

const aiVolumeSchema = z.object({
    aiDetailLifecycleState: z.enum(["active", "completed", "not-applicable"]).optional(),
    aiRunId: canonicalIdentifier(3, 180),
    childRunIds: uniqueArray(canonicalIdentifier(3, 180), 15),
    completedAt: nullableTimestamp,
    completedPairCount: boundedCount,
    createdAt: persistedTimestamp,
    createdBy: canonicalIdentifier(3, 180),
    estimatedCostUsd: boundedMoney.max(1_000_000),
    failedPairCount: boundedCount,
    failureCodes: uniqueArray(canonicalIdentifier(2, 180), 15),
    lockExpiresAt: nullableTimestamp,
    maxEstimatedCostUsd: boundedMoney.max(5),
    modelCallCount: boundedCount.max(1_000),
    projectedMaxCostUsd: boundedMoney.max(5).optional(),
    requestedPairCount: z.number().int().finite().min(1).max(15),
    status: z.enum(["running", "completed", "partial", "blocked"]),
    targetIds: uniqueArray(canonicalIdentifier(3, 160), 5),
    tasks: uniqueArray(z.enum(aiVolumeTasks), 3, 1),
    updatedAt: persistedTimestamp,
    volumeRunId: canonicalIdentifier(3, 180),
    workerType: z.literal("ai_volume_batch"),
    workerVersion: z.literal("ai-volume-v1"),
}).superRefine((value, context) => {
    if (
        value.aiRunId !== value.volumeRunId
        || (value.aiDetailLifecycleState !== "completed" && value.requestedPairCount !== value.targetIds.length * value.tasks.length)
    ) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "AI volume identity/pair count mismatch." });
    }
    if (value.completedPairCount + value.failedPairCount !== (value.status === "running" ? value.completedPairCount + value.failedPairCount : value.requestedPairCount)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Final AI volume result counts are incomplete." });
    }
    if ((value.status === "running") === Boolean(value.completedAt)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "AI volume completion time does not match status." });
    }
    if (value.estimatedCostUsd > value.maxEstimatedCostUsd || (value.projectedMaxCostUsd !== undefined && value.projectedMaxCostUsd > value.maxEstimatedCostUsd)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "AI volume cost exceeds founder maximum." });
    }
    if (value.childRunIds.length !== value.completedPairCount || value.failureCodes.length > value.failedPairCount) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "AI volume child/failure lineage does not match counts." });
    }
});

const activationWatchProjector = createProjector<"activationWatches">({
    identityField: "activationWatchId",
    schema: activationWatchSchema,
    workspaceKey: "activationWatches",
});
const approvalPacketProjector = createProjector<"approvalPackets">({
    identityField: "approvalPacketId",
    schema: approvalPacketSchema,
    workspaceKey: "approvalPackets",
});
const approvalProjector = createProjector<"approvals">({
    identityField: "approvalId",
    schema: approvalSchema,
    workspaceKey: "approvals",
});
const audienceSegmentProjector = createProjector<"audienceSegments">({
    identityField: "audienceSegmentId",
    schema: audienceSegmentSchema,
    workspaceKey: "audienceSegments",
});
const auditEventProjector = createProjector<"auditEvents">({
    identityField: "auditEventId",
    schema: auditEventSchema,
    workspaceKey: "auditEvents",
});
const channelHealthProjector = createProjector<"channelHealth">({
    identityField: "channel",
    schema: channelHealthSchema,
    workspaceKey: "channelHealth",
});
const channelWindowProjector = createProjector<"channelWindows">({
    identityField: "channelWindowId",
    schema: channelWindowSchema,
    workspaceKey: "channelWindows",
});
const commercialOfferProjector = createProjector<"commercialOffers">({
    identityField: "commercialOfferId",
    schema: commercialOfferSchema,
    workspaceKey: "commercialOffers",
});
const commercialOpportunityProjector = createProjector<"commercialOpportunities">({
    identityField: "opportunityId",
    schema: commercialOpportunitySchema,
    workspaceKey: "commercialOpportunities",
});
const connectorProjector = createProjector<"connectorSettings">({
    identityField: "connectorId",
    schema: connectorSchema,
    workspaceKey: "connectorSettings",
});
const demandSignalProjector = createProjector<"demandSignals">({
    identityField: "demandSignalId",
    schema: demandSignalSchema,
    workspaceKey: "demandSignals",
});
const draftProjector = createProjector<"drafts">({
    identityField: "draftId",
    schema: draftSchema,
    workspaceKey: "drafts",
});
const enrichmentResultProjector = createProjector<"enrichmentResults">({
    identityField: "enrichmentResultId",
    schema: enrichmentResultSchema,
    workspaceKey: "enrichmentResults",
});
const enrichmentWaterfallProjector = createProjector<"enrichmentWaterfalls">({
    identityField: "waterfallId",
    schema: enrichmentWaterfallSchema,
    workspaceKey: "enrichmentWaterfalls",
});
const evidencePacketProjector = createProjector<"evidencePackets">({
    identityField: "evidencePacketId",
    schema: evidencePacketSchema,
    workspaceKey: "evidencePackets",
});
const modelEvalProjector = createProjector<"modelEvals">({
    identityField: "modelEvalId",
    schema: modelEvalSchema,
    workspaceKey: "modelEvals",
});
const modelRouteProjector = createProjector<"modelRoutes">({
    identityField: "modelRouteId",
    schema: modelRouteSchema,
    workspaceKey: "modelRoutes",
});
const operatingEnvelopeProjector = createProjector<"operatingEnvelopes">({
    identityField: "operatingEnvelopeId",
    schema: operatingEnvelopeSchema,
    workspaceKey: "operatingEnvelopes",
});
const providerEvaluationProjector = createProjector<"providerEvaluations">({
    identityField: "providerEvaluationId",
    schema: providerEvaluationSchema,
    workspaceKey: "providerEvaluations",
});
const providerRetentionProjector = createProjector<"providerSourceRetentions">({
    identityField: "providerSourceRetentionId",
    schema: providerRetentionSchema,
    workspaceKey: "providerSourceRetentions",
});
const replyPlaybookProjector = createProjector<"replyPlaybooks">({
    identityField: "playbookId",
    schema: replyPlaybookSchema,
    workspaceKey: "replyPlaybooks",
});
const revenueAccountProjector = createProjector<"revenueAccounts">({
    identityField: "revenueAccountId",
    schema: revenueAccountSchema,
    workspaceKey: "revenueAccounts",
});
const runTimelineProjector = createProjector<"runTimelines">({
    identityField: "runTimelineId",
    schema: runTimelineSchema,
    workspaceKey: "runTimelines",
});
const sequencerHandoffProjector = createProjector<"sequencerHandoffs">({
    identityField: "sequencerHandoffId",
    schema: sequencerHandoffSchema,
    workspaceKey: "sequencerHandoffs",
});
const sequencerStepProjector = createProjector<"sequencerSteps">({
    identityField: "sequenceStepId",
    schema: sequencerStepSchema,
    workspaceKey: "sequencerSteps",
});
const sourceQualityProjector = createProjector<"sourceQualitySnapshots">({
    identityField: "sourceQualitySnapshotId",
    schema: sourceQualitySchema,
    workspaceKey: "sourceQualitySnapshots",
});
const strategistMemoProjector = createProjector<"strategistMemos">({
    identityField: "strategistMemoId",
    schema: strategistMemoSchema,
    workspaceKey: "strategistMemos",
});
const teamMemberProjector = createProjector<"teamMembers">({
    identityField: "teamMemberId",
    schema: teamMemberSchema,
    workspaceKey: "teamMembers",
});
const templateProjector = createProjector<"templates">({
    identityField: "templateId",
    schema: templateSchema,
    workspaceKey: "templates",
});
const trustPartnerDealProjector = createProjector<"trustPartnerDeals">({
    identityField: "dealId",
    schema: trustPartnerDealSchema,
    workspaceKey: "trustPartnerDeals",
});
const trustPartnerDeliverableProjector = createProjector<"trustPartnerDeliverables">({
    identityField: "deliverableId",
    schema: trustPartnerDeliverableSchema,
    workspaceKey: "trustPartnerDeliverables",
});
const trustPartnerMetricProjector = createProjector<"trustPartnerMetrics">({
    identityField: "metricsId",
    schema: trustPartnerMetricSchema,
    workspaceKey: "trustPartnerMetrics",
});
const trustPartnerNicheTestProjector = createProjector<"trustPartnerNicheTests">({
    identityField: "nicheTestId",
    schema: trustPartnerNicheTestSchema,
    workspaceKey: "trustPartnerNicheTests",
});
const trustPartnerProfileProjector = createProjector<"trustPartnerProfiles">({
    identityField: "partnerId",
    schema: trustPartnerProfileSchema,
    workspaceKey: "trustPartnerProfiles",
});
const trustPartnerRenewalProjector = createProjector<"trustPartnerRenewalDecisions">({
    identityField: "decisionId",
    schema: trustPartnerRenewalSchema,
    workspaceKey: "trustPartnerRenewalDecisions",
});
const vendorRunProjector = createProjector<"vendorRuns">({
    identityField: "vendorRunId",
    schema: vendorRunSchema,
    workspaceKey: "vendorRuns",
});
const providerEventProjector = createProjector<"providerEvents">({
    identityField: "eventId",
    schema: providerEventSchema,
    workspaceKey: "providerEvents",
});

const providerAccountProjector: WorkspaceCollectionProjector = {
    identityField: "providerAccountId",
    publicFields: Object.freeze([
        "credentialState", "dailyBudgetUsd", "disabledReason", "monthlyBudgetUsd", "ownerApproved", "perRunBudgetUsd",
        "provider", "providerAccountId", "spentMonthUsd", "spentTodayUsd", "status", "updatedAt", "use",
    ]),
    project: (raw, documentId, currentPeriod = getSignalDeskSpendPeriod()) => {
        const authority = parseSignalDeskProviderAccountDocument(raw, documentId, currentPeriod);
        const projected: WorkspaceItem<"providerAccounts"> = {
            credentialState: authority.credentialState,
            dailyBudgetUsd: authority.dailyBudgetUsd,
            disabledReason: authority.disabledReason,
            monthlyBudgetUsd: authority.monthlyBudgetUsd,
            ownerApproved: authority.ownerApproved,
            perRunBudgetUsd: authority.perRunBudgetUsd,
            provider: authority.provider,
            providerAccountId: authority.providerAccountId,
            spentMonthUsd: authority.spentMonthUsd,
            spentTodayUsd: authority.spentTodayUsd,
            status: authority.status,
            updatedAt: authority.updatedAt,
            use: authority.use,
        };
        return projected;
    },
};

const budgetPolicyProjector: WorkspaceCollectionProjector = {
    identityField: "budgetPolicyId",
    publicFields: Object.freeze([
        "budgetPolicyId", "dailyBudgetUsd", "monthlyBudgetUsd", "name", "perRunBudgetUsd", "provider", "scope", "scopeId",
        "spentMonthUsd", "spentTodayUsd", "status", "updatedAt",
    ]),
    project: (raw, documentId, currentPeriod = getSignalDeskSpendPeriod()) => {
        const authority = parseSignalDeskBudgetPolicyDocument(raw, documentId, currentPeriod);
        const projected: WorkspaceItem<"budgetPolicies"> = {
            budgetPolicyId: authority.budgetPolicyId,
            dailyBudgetUsd: authority.dailyBudgetUsd,
            monthlyBudgetUsd: authority.monthlyBudgetUsd,
            name: authority.name,
            perRunBudgetUsd: authority.perRunBudgetUsd,
            provider: authority.provider,
            scope: authority.scope,
            scopeId: authority.scopeId,
            spentMonthUsd: authority.spentMonthUsd,
            spentTodayUsd: authority.spentTodayUsd,
            status: authority.status,
            updatedAt: authority.updatedAt,
        };
        return projected;
    },
};

const conversationProjector: WorkspaceCollectionProjector = {
    identityField: "conversationId",
    publicFields: Object.freeze([
        "channel", "conversationId", "lastInboundAt", "lastInboundOccurredAt", "lastMessagePreview", "lastOutboundAt", "state",
        "legalRetentionReviewReason", "legalRetentionReviewRequired", "targetId", "targetName", "updatedAt",
    ]),
    project: (raw, documentId) => {
        const record = productIdentity(raw, documentId, "conversationId");
        const authority = Object.fromEntries([
            "pId",
            "channel", "conversationId", "lastInboundAt", "lastInboundOccurredAt", "latestMessageExportId", "lastMessagePreview", "lastOutboundAt", "state",
            "legalRetentionReviewReason", "legalRetentionReviewRequired", "sourceDataLifecycleCompletedAt", "sourceDataLifecycleKind",
            "sourceDataLifecycleState", "sourceDataLifecycleToken", "targetId", "targetName", "updatedAt", "updatedBy",
        ].filter(key => key in record).map(key => [key, record[key]]));
        return parseSignalDeskConversationSummaryDocument(authority, documentId);
    },
};

const outcomeProjector: WorkspaceCollectionProjector = {
    identityField: "outcomeSummaryId",
    publicFields: Object.freeze([
        "channel", "count", "day", "evidenceRef", "integrityStatus", "outcomeSummaryId", "outcomeType", "ownerQualifiedAt",
        "ownerReviewedAt", "routeTokenId", "source", "sourceEventId", "surfaces", "targetId", "targetName", "updatedAt",
    ]),
    project: (raw, documentId) => {
        const record = productIdentity(raw, documentId, "outcomeSummaryId");
        const authorityInput = Object.fromEntries([
            "pId", "channel", "count", "day", "evidenceRef", "integrityStatus", "latestOutcomeEventId", "outcomeSummaryId",
            "outcomeType", "ownerQualifiedAt", "ownerReviewedAt", "routeTokenId", "source", "sourceEventId", "surfaces",
            "targetId", "targetName", "updatedAt",
        ].filter(key => key in record).map(key => [key, record[key]]));
        const authority = parseSignalDeskOutcomeSummaryDocument(authorityInput, documentId);
        const projected: WorkspaceItem<"outcomes"> = {
            channel: authority.channel,
            count: authority.count,
            day: authority.day,
            evidenceRef: authority.evidenceRef,
            integrityStatus: authority.integrityStatus,
            outcomeSummaryId: authority.outcomeSummaryId,
            outcomeType: authority.outcomeType,
            ownerQualifiedAt: authority.ownerQualifiedAt,
            ownerReviewedAt: authority.ownerReviewedAt,
            routeTokenId: authority.routeTokenId,
            source: authority.source,
            sourceEventId: authority.sourceEventId,
            surfaces: authority.surfaces,
            targetId: authority.targetId,
            targetName: authority.targetName,
            updatedAt: authority.updatedAt,
        };
        return projected;
    },
};

const revenueControlProjector: WorkspaceCollectionProjector = {
    identityField: "revenueControlSummaryId",
    publicFields: publicFieldsForSchema(revenueControlSchema),
    project: (raw, documentId) => {
        const record = productIdentity(raw, documentId, "revenueControlSummaryId", SIGNALDESK_SUMMARY_DOCS.REVENUE);
        const projected = parseWorkspaceProjection(revenueControlSchema, record) as WorkspaceItem<"revenueControlSummaries">;
        return projected.pipelineValueMinor === 0 && projected.pipelineCurrency
            ? { ...projected, pipelineCurrency: null }
            : projected;
    },
};

const aiRunPublicFields = Object.freeze(Array.from(new Set([
    ...publicFieldsForSchema(aiWorkerSchema),
    ...publicFieldsForSchema(aiVolumeSchema),
    "scoreId", "fitScore", "currentListGapScore", "contactabilityScore", "riskScore", "segment", "nextAction", "reasons",
])));

const aiRunProjector: WorkspaceCollectionProjector = {
    identityField: "aiRunId|scoreId",
    publicFields: aiRunPublicFields,
    project: (raw, documentId) => {
        const record = recordValue(raw, "SIGNALDESK_AI_WORKSPACE_SHAPE_INVALID");
        if (record.pId !== SIGNALDESK_PRODUCT_CODE) fail("SIGNALDESK_WORKSPACE_PRODUCT_MISMATCH");
        if (record.workerType === "target_score") {
            productIdentity(record, documentId, "scoreId");
            const targetId = canonicalIdentifier(3, 160).parse(record.targetId);
            return parseSignalDeskTargetScoreDocument(record, documentId, targetId);
        }
        if (record.workerType === "ai_volume_batch") {
            productIdentity(record, documentId, "aiRunId");
            if (record.volumeRunId !== documentId) fail("SIGNALDESK_WORKSPACE_DOCUMENT_IDENTITY_MISMATCH");
            return parseWorkspaceProjection(aiVolumeSchema, record);
        }
        if (typeof record.workerType === "string" && record.workerType.startsWith("ai_assist_")) {
            productIdentity(record, documentId, "aiRunId");
            return parseWorkspaceProjection(aiWorkerSchema, record);
        }
        return fail("SIGNALDESK_AI_WORKSPACE_VARIANT_INVALID");
    },
};

const WORKSPACE_COLLECTION_PROJECTORS: Readonly<Record<SignalDeskWorkspaceGenericCollection, WorkspaceCollectionProjector>> = Object.freeze({
    [SIGNALDESK_COLLECTIONS.ACTIVATION_WATCHES]: activationWatchProjector,
    [SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS]: aiRunProjector,
    [SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS]: approvalPacketProjector,
    [SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE]: approvalProjector,
    [SIGNALDESK_COLLECTIONS.AUDIENCE_SEGMENTS]: audienceSegmentProjector,
    [SIGNALDESK_COLLECTIONS.AUDIT_EVENTS]: auditEventProjector,
    [SIGNALDESK_COLLECTIONS.BUDGET_POLICIES]: budgetPolicyProjector,
    [SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES]: channelHealthProjector,
    [SIGNALDESK_COLLECTIONS.CHANNEL_WINDOW_STATES]: channelWindowProjector,
    [SIGNALDESK_COLLECTIONS.COMMERCIAL_OFFERS]: commercialOfferProjector,
    [SIGNALDESK_COLLECTIONS.COMMERCIAL_OPPORTUNITIES]: commercialOpportunityProjector,
    [SIGNALDESK_COLLECTIONS.CONNECTOR_SETTINGS]: connectorProjector,
    [SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES]: conversationProjector,
    [SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES]: demandSignalProjector,
    [SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES]: draftProjector,
    [SIGNALDESK_COLLECTIONS.ENRICHMENT_RESULTS]: enrichmentResultProjector,
    [SIGNALDESK_COLLECTIONS.ENRICHMENT_WATERFALLS]: enrichmentWaterfallProjector,
    [SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES]: evidencePacketProjector,
    [SIGNALDESK_COLLECTIONS.MODEL_EVALS]: modelEvalProjector,
    [SIGNALDESK_COLLECTIONS.MODEL_ROUTES]: modelRouteProjector,
    [SIGNALDESK_COLLECTIONS.OPERATING_ENVELOPES]: operatingEnvelopeProjector,
    [SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES]: outcomeProjector,
    [SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS]: providerAccountProjector,
    [SIGNALDESK_COLLECTIONS.PROVIDER_EVALUATIONS]: providerEvaluationProjector,
    [SIGNALDESK_COLLECTIONS.PROVIDER_SOURCE_RETENTION]: providerRetentionProjector,
    [SIGNALDESK_COLLECTIONS.REPLY_PLAYBOOKS]: replyPlaybookProjector,
    [SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS]: revenueAccountProjector,
    [SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES]: revenueControlProjector,
    [SIGNALDESK_COLLECTIONS.RUN_TIMELINES]: runTimelineProjector,
    [SIGNALDESK_COLLECTIONS.SEQUENCER_HANDOFFS]: sequencerHandoffProjector,
    [SIGNALDESK_COLLECTIONS.SEQUENCER_STEPS]: sequencerStepProjector,
    [SIGNALDESK_COLLECTIONS.SOURCE_QUALITY_SNAPSHOTS]: sourceQualityProjector,
    [SIGNALDESK_COLLECTIONS.STRATEGIST_MEMOS]: strategistMemoProjector,
    [SIGNALDESK_COLLECTIONS.TEAM_MEMBERS]: teamMemberProjector,
    [SIGNALDESK_COLLECTIONS.TEMPLATE_SUMMARIES]: templateProjector,
    [SIGNALDESK_COLLECTIONS.TRUST_PARTNER_DEALS]: trustPartnerDealProjector,
    [SIGNALDESK_COLLECTIONS.TRUST_PARTNER_DELIVERABLES]: trustPartnerDeliverableProjector,
    [SIGNALDESK_COLLECTIONS.TRUST_PARTNER_METRICS]: trustPartnerMetricProjector,
    [SIGNALDESK_COLLECTIONS.TRUST_PARTNER_NICHE_TESTS]: trustPartnerNicheTestProjector,
    [SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES]: trustPartnerProfileProjector,
    [SIGNALDESK_COLLECTIONS.TRUST_PARTNER_RENEWAL_DECISIONS]: trustPartnerRenewalProjector,
    [SIGNALDESK_COLLECTIONS.VENDOR_RUNS]: vendorRunProjector,
    [SIGNALDESK_COLLECTIONS.WEBHOOK_EVENTS]: providerEventProjector,
});

export const isSignalDeskWorkspaceGenericCollection = (collection: string): collection is SignalDeskWorkspaceGenericCollection => (
    collectionSet.has(collection)
);

export const getSignalDeskWorkspaceDocumentIdentityField = (collection: SignalDeskWorkspaceGenericCollection) => (
    WORKSPACE_COLLECTION_PROJECTORS[collection].identityField
);

export const getSignalDeskWorkspacePublicFields = (collection: SignalDeskWorkspaceGenericCollection): readonly string[] => (
    WORKSPACE_COLLECTION_PROJECTORS[collection].publicFields
);

export const assertSignalDeskWorkspaceDocument = (
    collection: SignalDeskWorkspaceGenericCollection,
    raw: unknown,
    documentId: string,
    currentPeriod?: SignalDeskSpendPeriod,
): SignalDeskWorkspaceProjection => {
    canonicalIdentifier(1, 300).parse(documentId);
    return WORKSPACE_COLLECTION_PROJECTORS[collection].project(raw, documentId, currentPeriod);
};

export const projectSignalDeskWorkspaceDocument = (
    collection: SignalDeskWorkspaceGenericCollection,
    raw: unknown,
    documentId: string,
    currentPeriod?: SignalDeskSpendPeriod,
): SignalDeskWorkspaceProjection | null => {
    try {
        return assertSignalDeskWorkspaceDocument(collection, raw, documentId, currentPeriod);
    } catch {
        return null;
    }
};

export interface SignalDeskWorkspaceDocumentInput {
    readonly data: unknown;
    readonly id: string;
}

export const projectSignalDeskWorkspaceDocuments = (
    collection: SignalDeskWorkspaceGenericCollection,
    documents: readonly SignalDeskWorkspaceDocumentInput[],
    options?: {
        currentPeriod?: SignalDeskSpendPeriod;
        limit?: number;
    },
): SignalDeskWorkspaceProjection[] => {
    const limit = options?.limit ?? 30;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) fail("SIGNALDESK_WORKSPACE_PROJECTION_LIMIT_INVALID");
    const projected: SignalDeskWorkspaceProjection[] = [];
    for (const document of documents) {
        const item = projectSignalDeskWorkspaceDocument(collection, document.data, document.id, options?.currentPeriod);
        if (item) projected.push(item);
        if (projected.length === limit) break;
    }
    return projected;
};
