import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
import type {
    SignalDeskAiScoreSummary,
    SignalDeskResearchRunSummary,
    SignalDeskResearchTableRowSummary,
    SignalDeskSourceProviderId,
    SignalDeskSourceRunSummary,
    SignalDeskTargetSummary,
} from "@type/signaldesk";
import { z } from "zod";

const optionalBoundedText = (maximum: number) => z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(maximum).optional(),
);

const canonicalHttpUrl = z.string().trim().max(500).superRefine((value, context) => {
    try {
        const parsed = new URL(value);
        if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || parsed.username || parsed.password) {
            context.addIssue({ code: z.ZodIssueCode.custom, message: "URL must be credential-free HTTP(S)." });
        }
    } catch {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "URL is invalid." });
    }
}).transform((value) => {
    const parsed = new URL(value);
    parsed.hash = "";
    return parsed.toString();
});

const optionalHttpUrl = z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    canonicalHttpUrl.optional(),
);

const persistedHttpUrl = z.string().trim().max(500).superRefine((value, context) => {
    try {
        const parsed = new URL(value);
        if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || parsed.username || parsed.password) {
            context.addIssue({ code: z.ZodIssueCode.custom, message: "Persisted URL must be credential-free HTTP(S)." });
        }
    } catch {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Persisted URL is invalid." });
    }
}).transform((value) => {
    const parsed = new URL(value);
    parsed.hash = "";
    return parsed.toString();
});

const optionalCanonicalPhone = z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().max(80).transform((value, context) => {
        const trimmed = value.trim();
        const digits = trimmed.replace(/\D/g, "");
        if (!/^\+[0-9\s().-]+$/.test(trimmed) || digits.length < 8 || digits.length > 15) {
            context.addIssue({ code: z.ZodIssueCode.custom, message: "Phone number is invalid." });
            return z.NEVER;
        }
        return `+${digits}`;
    }).optional(),
);

const optionalInstagramHandle = z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().max(180).transform((value, context) => {
        const normalized = value.trim().toLowerCase().replace(/^@/, "");
        if (!/^[a-z0-9._]{1,30}$/.test(normalized)) {
            context.addIssue({ code: z.ZodIssueCode.custom, message: "Instagram handle is invalid." });
            return z.NEVER;
        }
        return normalized;
    }).optional(),
);

const nullableCanonicalEmail = z.string().max(180).email().refine(
    (value) => value === value.trim() && value === value.toLowerCase(),
    "Persisted email must be canonical lowercase.",
).nullable().optional();
const nullableCanonicalPhone = z.string().regex(/^\+\d{8,15}$/).nullable().optional();
const nullableInstagramHandle = z.string().regex(/^[a-z0-9._]{1,30}$/).nullable().optional();
const nullableHttpUrl = persistedHttpUrl.nullable().optional();


export const SignalDeskTargetImportRowSchema = z.object({
    category: optionalBoundedText(120),
    city: optionalBoundedText(120),
    country: optionalBoundedText(120),
    currentListUrl: optionalHttpUrl,
    displayName: z.string().trim().min(2).max(180),
    email: z.preprocess(
        (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
        z.string().trim().email().max(180).transform((value) => value.toLowerCase()).optional(),
    ),
    instagram: optionalInstagramHandle,
    notes: optionalBoundedText(500),
    permissionEvidenceRef: optionalBoundedText(500),
    phone: optionalCanonicalPhone,
    providerRecordId: optionalBoundedText(240),
    providerRecordUrl: optionalHttpUrl,
    website: optionalHttpUrl,
}).strict();

export const SignalDeskTargetImportSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(180),
    rows: z.array(SignalDeskTargetImportRowSchema).min(1).max(50),
    sourceName: z.string().trim().min(2).max(160),
    sourcePolicyId: z.string().trim().min(3).max(160),
}).strict();

export const SignalDeskManualTargetImportSchema = SignalDeskTargetImportSchema.superRefine((value, context) => {
    value.rows.forEach((row, index) => {
        if (row.providerRecordId || row.providerRecordUrl) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Provider identity requires a trusted provider run.",
                path: ["rows", index],
            });
        }
    });
});

export type SignalDeskTargetImportRow = z.infer<typeof SignalDeskTargetImportRowSchema>;
export type SignalDeskTargetImportInput = z.infer<typeof SignalDeskTargetImportSchema>;

export const SIGNALDESK_TARGET_PAGE_SIZE = 30;

export type SignalDeskTargetCursor = {
    targetId: string;
    updatedAt: string;
};

const isCanonicalTargetId = (value: string) => /^[A-Za-z0-9_-]{3,160}$/.test(value);

const isCanonicalIsoTimestamp = (value: string) => {
    if (value.length > 64) return false;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
};

export const parseSignalDeskTargetCursor = (
    updatedAt: string | null,
    targetId: string | null,
): SignalDeskTargetCursor | null | undefined => {
    if (updatedAt === null && targetId === null) return undefined;
    if (
        updatedAt === null
        || targetId === null
        || !isCanonicalIsoTimestamp(updatedAt)
        || !isCanonicalTargetId(targetId)
    ) return null;
    return { targetId, updatedAt };
};

export const getSignalDeskTargetCursor = (
    target: SignalDeskTargetSummary | undefined,
): SignalDeskTargetCursor | null => {
    if (!target?.updatedAt) return null;
    return parseSignalDeskTargetCursor(target.updatedAt, target.targetId) || null;
};

const timestampToIso = (value: unknown): string | null => {
    if (typeof value !== "object" || value === null || !("toDate" in value) || typeof value.toDate !== "function") {
        return null;
    }
    try {
        const date = value.toDate();
        return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
        return null;
    }
};

const nullableText = (maximum: number) => z.string().trim().max(maximum).nullable().optional();
const trustedSourceProviders = [
    "google-places",
    "foursquare",
    "apify",
    "fhrs-fhis",
] as const satisfies readonly Exclude<SignalDeskSourceProviderId, "manual">[];
const targetStatus = z.enum(["new", "review", "ready", "held", "rejected", "contacted", "replied", "converted"]);
const targetSegment = z.enum(["a", "b", "c", "hold", "reject"]);
const targetOpportunity = z.enum(["missing-current-list", "stale-menu", "instagram-only", "pdf-only", "no-link", "unknown"]);
const targetConfidence = z.enum(["high", "medium", "low", "blocked"]);
const targetContactability = z.enum(["ready", "limited", "missing", "blocked"]);
const targetSuppression = z.enum(["clear", "suppressed", "wrong-contact", "complaint"]);
const targetNextAction = z.enum(["review", "enrich", "score", "evidence", "draft", "approve", "export", "contact", "reply", "outcome", "hold", "reject"]);
const boundedScore = z.number().finite().min(0).max(100);

const targetSummarySchema = z.object({
    category: nullableText(120),
    city: nullableText(120),
    contactability: targetContactability,
    contactabilityScore: boundedScore.optional(),
    country: nullableText(120),
    currentListGapScore: boundedScore.optional(),
    currentListUrl: nullableHttpUrl,
    displayName: z.string().trim().min(2).max(180),
    fitScore: boundedScore.optional(),
    latestApprovalId: nullableText(160),
    latestConversationId: nullableText(160),
    latestDraftId: nullableText(160),
    latestManualContactAt: z.unknown().optional(),
    latestManualContactResult: z.enum(["contacted", "no-answer", "wrong-contact", "requested-later", "declined", "introduced"]).nullable().optional(),
    latestManualContactRoute: z.enum(["email-export", "partner-intro"]).nullable().optional(),
    latestOutcomeAt: z.unknown().optional(),
    latestVerifiedActivationAt: z.unknown().optional(),
    latestVerifiedActivationEvidenceRef: nullableText(500),
    latestVerifiedActivationIntegrityStatus: z.enum(["owner-reviewed-manual", "menulist-signed"]).nullable().optional(),
    latestVerifiedActivationSurfaces: z.array(z.enum(["qr", "whatsapp", "google-profile", "instagram", "website", "print", "other"])).max(7).optional(),
    nextAction: targetNextAction,
    ownerQualifiedAt: z.unknown().optional(),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    primaryOpportunity: targetOpportunity,
    riskScore: boundedScore.optional(),
    segment: targetSegment,
    sourceConfidence: targetConfidence,
    sourcePolicyId: nullableText(160),
    sourceRunId: nullableText(160),
    status: targetStatus,
    suppressionStatus: targetSuppression,
    targetId: z.string().trim().min(3).max(160),
    updatedAt: z.unknown(),
    website: nullableHttpUrl,
});

export const parseSignalDeskTargetSummaryDocument = (raw: unknown, documentId: string): SignalDeskTargetSummary => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("TARGET_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("TARGET_PRODUCT_MISMATCH");
    if (identity.targetId !== documentId) throw new Error("TARGET_IDENTITY_MISMATCH");
    const parsed = targetSummarySchema.safeParse(raw);
    if (!parsed.success) throw new Error("TARGET_SHAPE_INVALID");
    if (parsed.data.targetId !== documentId) throw new Error("TARGET_IDENTITY_MISMATCH");
    const latestManualContactAt = timestampToIso(parsed.data.latestManualContactAt);
    const latestOutcomeAt = timestampToIso(parsed.data.latestOutcomeAt);
    const latestVerifiedActivationAt = timestampToIso(parsed.data.latestVerifiedActivationAt);
    const ownerQualifiedAt = timestampToIso(parsed.data.ownerQualifiedAt);
    const updatedAt = timestampToIso(parsed.data.updatedAt);
    const timestampPairs: Array<[unknown, string | null]> = [
        [parsed.data.latestManualContactAt, latestManualContactAt],
        [parsed.data.latestOutcomeAt, latestOutcomeAt],
        [parsed.data.latestVerifiedActivationAt, latestVerifiedActivationAt],
        [parsed.data.ownerQualifiedAt, ownerQualifiedAt],
    ];
    if (timestampPairs.some(([value, projected]) => value !== undefined && value !== null && !projected) || !updatedAt) {
        throw new Error("TARGET_SHAPE_INVALID");
    }
    const projected = {
        category: parsed.data.category,
        city: parsed.data.city,
        contactability: parsed.data.contactability,
        contactabilityScore: parsed.data.contactabilityScore,
        country: parsed.data.country,
        currentListGapScore: parsed.data.currentListGapScore,
        currentListUrl: parsed.data.currentListUrl,
        displayName: parsed.data.displayName,
        fitScore: parsed.data.fitScore,
        latestApprovalId: parsed.data.latestApprovalId,
        latestConversationId: parsed.data.latestConversationId,
        latestDraftId: parsed.data.latestDraftId,
        latestManualContactAt,
        latestManualContactResult: parsed.data.latestManualContactResult,
        latestManualContactRoute: parsed.data.latestManualContactRoute,
        latestOutcomeAt,
        latestVerifiedActivationAt,
        latestVerifiedActivationEvidenceRef: parsed.data.latestVerifiedActivationEvidenceRef,
        latestVerifiedActivationIntegrityStatus: parsed.data.latestVerifiedActivationIntegrityStatus,
        latestVerifiedActivationSurfaces: parsed.data.latestVerifiedActivationSurfaces,
        nextAction: parsed.data.nextAction,
        ownerQualifiedAt,
        primaryOpportunity: parsed.data.primaryOpportunity,
        riskScore: parsed.data.riskScore,
        segment: parsed.data.segment,
        sourceConfidence: parsed.data.sourceConfidence,
        sourcePolicyId: parsed.data.sourcePolicyId,
        sourceRunId: parsed.data.sourceRunId,
        status: parsed.data.status,
        suppressionStatus: parsed.data.suppressionStatus,
        targetId: parsed.data.targetId,
        updatedAt,
        website: parsed.data.website,
    } satisfies SignalDeskTargetSummary;
    return projected;
};

const targetScoreSchema = z.object({
    contactabilityScore: boundedScore,
    costEstimate: z.literal(0),
    createdAt: z.unknown(),
    currentListGapScore: boundedScore,
    fitScore: boundedScore,
    nextAction: targetNextAction,
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    reasons: z.array(z.string().trim().min(1).max(240)).min(1).max(20),
    riskScore: boundedScore,
    scoreId: z.string().trim().min(3).max(160),
    segment: targetSegment,
    targetId: z.string().trim().min(3).max(160),
    workerType: z.literal("target_score"),
    workerVersion: z.literal("rules-v1"),
}).passthrough();

export const parseSignalDeskTargetScoreDocument = (
    raw: unknown,
    documentId: string,
    expectedTargetId: string,
): SignalDeskAiScoreSummary => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("TARGET_SCORE_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("TARGET_SCORE_PRODUCT_MISMATCH");
    if (identity.scoreId !== documentId || identity.targetId !== expectedTargetId) throw new Error("TARGET_SCORE_IDENTITY_MISMATCH");
    const parsed = targetScoreSchema.safeParse(raw);
    if (!parsed.success) throw new Error("TARGET_SCORE_SHAPE_INVALID");
    const createdAt = timestampToIso(parsed.data.createdAt);
    if (!createdAt) throw new Error("TARGET_SCORE_SHAPE_INVALID");
    return {
        contactabilityScore: parsed.data.contactabilityScore,
        createdAt,
        currentListGapScore: parsed.data.currentListGapScore,
        fitScore: parsed.data.fitScore,
        nextAction: parsed.data.nextAction,
        reasons: parsed.data.reasons,
        riskScore: parsed.data.riskScore,
        scoreId: parsed.data.scoreId,
        segment: parsed.data.segment,
        targetId: parsed.data.targetId,
    };
};

const targetDetailSchema = targetSummarySchema.extend({
    email: nullableCanonicalEmail,
    identityHash: z.string().trim().length(64),
    identityVersion: z.enum(["legacy-business-v1", "provider-record-v1", "provider-url-v1", "provider-business-v1"]).optional(),
    instagram: nullableInstagramHandle,
    legacyIdentityHash: z.string().trim().length(64).nullable().optional(),
    notes: nullableText(500),
    permissionEvidenceRef: nullableText(500),
    phone: nullableCanonicalPhone,
    provider: z.enum(trustedSourceProviders).nullable().optional(),
    providerRecordId: nullableText(240),
    providerRecordUrl: nullableHttpUrl,
});

export type SignalDeskTargetDetailDocument = z.infer<typeof targetDetailSchema>;

export const parseSignalDeskTargetDetailDocument = (raw: unknown, documentId: string): SignalDeskTargetDetailDocument => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("TARGET_DETAIL_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("TARGET_PRODUCT_MISMATCH");
    if (identity.targetId !== documentId) throw new Error("TARGET_IDENTITY_MISMATCH");
    parseSignalDeskTargetSummaryDocument(raw, documentId);
    const parsed = targetDetailSchema.safeParse(raw);
    if (!parsed.success) throw new Error("TARGET_DETAIL_SHAPE_INVALID");
    if (parsed.data.targetId !== documentId) throw new Error("TARGET_IDENTITY_MISMATCH");
    const provider = parsed.data.provider || null;
    const providerRecordId = parsed.data.providerRecordId || null;
    const providerRecordUrl = parsed.data.providerRecordUrl || null;
    const identityVersion = parsed.data.identityVersion || (
        providerRecordId
            ? "provider-record-v1"
            : providerRecordUrl
                ? "provider-url-v1"
                : provider
                    ? "provider-business-v1"
                    : "legacy-business-v1"
    );
    const validIdentityCoupling = identityVersion === "legacy-business-v1"
        ? !provider && !providerRecordId && !providerRecordUrl
        : identityVersion === "provider-record-v1"
            ? Boolean(provider && providerRecordId)
            : identityVersion === "provider-url-v1"
                ? Boolean(provider && !providerRecordId && providerRecordUrl)
                : Boolean(provider && !providerRecordId && !providerRecordUrl);
    if (!validIdentityCoupling) throw new Error("TARGET_DETAIL_SHAPE_INVALID");
    return {
        ...parsed.data,
        identityVersion,
        provider,
        providerRecordId,
        providerRecordUrl,
    };
};

const identityIndexSchema = z.object({
    createdAt: z.unknown().optional(),
    identityHash: z.string().length(64).regex(/^[a-f0-9]{64}$/),
    identityVersion: z.enum(["legacy-business-v1", "provider-record-v1", "provider-url-v1", "provider-business-v1"]).optional(),
    legacyIdentityHash: z.string().length(64).regex(/^[a-f0-9]{64}$/).nullable().optional(),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE).optional(),
    targetId: z.string().min(3).max(160).refine((value) => value === value.trim()),
    updatedAt: z.unknown().optional(),
});

export type SignalDeskIdentityIndexDocument = Pick<z.infer<typeof identityIndexSchema>,
    "identityHash" | "identityVersion" | "legacyIdentityHash" | "pId" | "targetId"
>;

export const parseSignalDeskIdentityIndexDocument = (
    raw: unknown,
    documentId: string,
    options: { allowExactLegacyProductMissing?: boolean } = {},
): SignalDeskIdentityIndexDocument & { legacyProductMissing: boolean } => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("TARGET_IDENTITY_INDEX_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== undefined && identity.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("TARGET_PRODUCT_MISMATCH");
    if (identity.identityHash !== documentId) throw new Error("TARGET_IDENTITY_MISMATCH");
    const parsed = identityIndexSchema.safeParse(raw);
    if (!parsed.success) throw new Error("TARGET_IDENTITY_INDEX_SHAPE_INVALID");
    if (parsed.data.identityHash !== documentId) throw new Error("TARGET_IDENTITY_MISMATCH");
    const legacyProductMissing = !parsed.data.pId;
    if (legacyProductMissing && !options.allowExactLegacyProductMissing) throw new Error("TARGET_PRODUCT_MISMATCH");
    return {
        identityHash: parsed.data.identityHash,
        identityVersion: parsed.data.identityVersion,
        legacyIdentityHash: parsed.data.legacyIdentityHash,
        pId: parsed.data.pId,
        targetId: parsed.data.targetId,
        legacyProductMissing,
    };
};

const contactIdentitySchema = z.object({
    channel: z.enum(["email", "phone", "whatsapp", "instagram", "messenger"]),
    expiresAt: z.unknown().nullable().optional(),
    identityId: z.string().min(3).max(160).refine((value) => value === value.trim()),
    observedAt: z.unknown().optional(),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE).optional(),
    permissionEvidenceRef: z.string().trim().max(500).nullable().optional(),
    permissionState: z.enum(["permissioned", "research_only", "blocked", "review_required", "expired"]),
    sourcePolicyId: z.string().min(3).max(160).refine((value) => value === value.trim()),
    sourceRunId: z.string().min(3).max(160).refine((value) => value === value.trim()),
    targetId: z.string().min(3).max(160).refine((value) => value === value.trim()),
    updatedAt: z.unknown().optional(),
    value: z.string().trim().min(1).max(180),
});

export type SignalDeskContactIdentityDocument = Pick<z.infer<typeof contactIdentitySchema>,
    "channel" | "identityId" | "pId" | "permissionEvidenceRef" | "permissionState" | "sourcePolicyId" | "sourceRunId" | "targetId" | "value"
>;

export const parseSignalDeskContactIdentityDocument = (
    raw: unknown,
    documentId: string,
    options: { allowExactLegacyProductMissing?: boolean } = {},
): SignalDeskContactIdentityDocument & { legacyProductMissing: boolean } => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("CONTACT_IDENTITY_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== undefined && identity.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("CONTACT_IDENTITY_PRODUCT_MISMATCH");
    if (identity.identityId !== documentId) throw new Error("CONTACT_IDENTITY_MISMATCH");
    const parsed = contactIdentitySchema.safeParse(raw);
    if (!parsed.success) throw new Error("CONTACT_IDENTITY_SHAPE_INVALID");
    if (parsed.data.identityId !== documentId) throw new Error("CONTACT_IDENTITY_MISMATCH");
    const legacyProductMissing = !parsed.data.pId;
    if (legacyProductMissing && !options.allowExactLegacyProductMissing) throw new Error("CONTACT_IDENTITY_PRODUCT_MISMATCH");
    return {
        channel: parsed.data.channel,
        identityId: parsed.data.identityId,
        pId: parsed.data.pId,
        permissionEvidenceRef: parsed.data.permissionEvidenceRef,
        permissionState: parsed.data.permissionState,
        sourcePolicyId: parsed.data.sourcePolicyId,
        sourceRunId: parsed.data.sourceRunId,
        targetId: parsed.data.targetId,
        value: parsed.data.value,
        legacyProductMissing,
    };
};

const sourceCandidateSchema = z.object({
    blocked: z.boolean(),
    createdAt: z.unknown().optional(),
    displayName: z.string().trim().min(2).max(180),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    permissionEvidenceRef: z.string().trim().max(500).nullable().optional(),
    sourceCandidateId: z.string().min(3).max(160).refine((value) => value === value.trim()),
    sourcePolicyId: z.string().min(3).max(160).refine((value) => value === value.trim()),
    sourceRunId: z.string().min(3).max(160).refine((value) => value === value.trim()),
    targetId: z.string().min(3).max(160).refine((value) => value === value.trim()),
});

export type SignalDeskSourceCandidateDocument = Pick<z.infer<typeof sourceCandidateSchema>,
    "blocked" | "displayName" | "pId" | "permissionEvidenceRef" | "sourceCandidateId" | "sourcePolicyId" | "sourceRunId" | "targetId"
>;

export const parseSignalDeskSourceCandidateDocument = (raw: unknown, documentId: string): SignalDeskSourceCandidateDocument => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("SOURCE_CANDIDATE_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("SOURCE_CANDIDATE_PRODUCT_MISMATCH");
    if (identity.sourceCandidateId !== documentId) throw new Error("SOURCE_CANDIDATE_IDENTITY_MISMATCH");
    const parsed = sourceCandidateSchema.safeParse(raw);
    if (!parsed.success) throw new Error("SOURCE_CANDIDATE_SHAPE_INVALID");
    if (parsed.data.sourceCandidateId !== documentId) throw new Error("SOURCE_CANDIDATE_IDENTITY_MISMATCH");
    return {
        blocked: parsed.data.blocked,
        displayName: parsed.data.displayName,
        pId: parsed.data.pId,
        permissionEvidenceRef: parsed.data.permissionEvidenceRef,
        sourceCandidateId: parsed.data.sourceCandidateId,
        sourcePolicyId: parsed.data.sourcePolicyId,
        sourceRunId: parsed.data.sourceRunId,
        targetId: parsed.data.targetId,
    };
};

const nonNegativeInteger = z.number().int().min(0);
const sourceRunSchema = z.object({
    blockedCount: nonNegativeInteger,
    createdAt: z.unknown(),
    duplicateCount: nonNegativeInteger,
    importedCount: z.number().int().min(1).max(50),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    sourceName: z.string().trim().min(2).max(160),
    sourcePolicyId: z.string().trim().min(3).max(160),
    sourceRunId: z.string().trim().min(3).max(160),
    status: z.enum(["completed", "partial", "blocked"]),
    suppressedCount: nonNegativeInteger,
    updatedAt: z.unknown(),
});

export const parseSignalDeskSourceRunDocument = (raw: unknown, documentId: string): SignalDeskSourceRunSummary => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("SOURCE_RUN_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("SOURCE_RUN_PRODUCT_MISMATCH");
    if (identity.sourceRunId !== documentId) throw new Error("SOURCE_RUN_IDENTITY_MISMATCH");
    const parsed = sourceRunSchema.safeParse(raw);
    if (!parsed.success) throw new Error("SOURCE_RUN_SHAPE_INVALID");
    const createdAt = timestampToIso(parsed.data.createdAt);
    const updatedAt = timestampToIso(parsed.data.updatedAt);
    const expectedStatus = parsed.data.blockedCount === parsed.data.importedCount
        ? "blocked"
        : parsed.data.blockedCount > 0
            ? "partial"
            : "completed";
    if (
        !createdAt
        || !updatedAt
        || parsed.data.duplicateCount > parsed.data.importedCount
        || parsed.data.suppressedCount > parsed.data.importedCount
        || parsed.data.blockedCount > parsed.data.importedCount
        || parsed.data.status !== expectedStatus
    ) throw new Error("SOURCE_RUN_SHAPE_INVALID");
    return {
        blockedCount: parsed.data.blockedCount,
        createdAt,
        duplicateCount: parsed.data.duplicateCount,
        importedCount: parsed.data.importedCount,
        sourceName: parsed.data.sourceName,
        sourcePolicyId: parsed.data.sourcePolicyId,
        sourceRunId: parsed.data.sourceRunId,
        status: parsed.data.status,
        suppressedCount: parsed.data.suppressedCount,
        updatedAt,
    };
};

const researchProvider = z.enum(["google-places", "apify", "fhrs-fhis"]);
const researchRunSchema = z.object({
    category: nullableText(120),
    city: nullableText(120),
    country: nullableText(120),
    createdAt: z.unknown(),
    enrichmentColumns: z.array(z.string().trim().min(1).max(120)).max(30),
    failCount: nonNegativeInteger,
    idempotencyKeyHash: nullableText(128),
    marketPodId: nullableText(160),
    maxResults: z.number().int().min(1).max(30),
    normalizedQuery: z.string().trim().min(1).max(500),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    passCount: nonNegativeInteger,
    prompt: z.string().trim().min(1).max(2_000),
    provider: researchProvider,
    providerRunIds: z.array(z.string().trim().min(1).max(160)).max(20),
    researchRunId: z.string().trim().min(3).max(160),
    researchType: z.enum(["business-prospect", "market-map", "partner-list"]),
    sourcePolicyId: nullableText(160),
    sourceTransparency: z.array(z.string().trim().min(1).max(500)).max(30),
    status: z.enum(["queued", "running", "completed", "blocked"]),
    tableRowCount: nonNegativeInteger,
    unsureCount: nonNegativeInteger,
    updatedAt: z.unknown(),
});

export const parseSignalDeskResearchRunDocument = (raw: unknown, documentId: string): SignalDeskResearchRunSummary => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("RESEARCH_RUN_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("RESEARCH_RUN_PRODUCT_MISMATCH");
    if (identity.researchRunId !== documentId) throw new Error("RESEARCH_RUN_IDENTITY_MISMATCH");
    const parsed = researchRunSchema.safeParse(raw);
    if (!parsed.success) throw new Error("RESEARCH_RUN_SHAPE_INVALID");
    const createdAt = timestampToIso(parsed.data.createdAt);
    const updatedAt = timestampToIso(parsed.data.updatedAt);
    if (!createdAt || !updatedAt) throw new Error("RESEARCH_RUN_SHAPE_INVALID");
    const terminalCount = parsed.data.passCount + parsed.data.failCount + parsed.data.unsureCount;
    const isInFlight = parsed.data.status === "queued" || parsed.data.status === "running";
    if (
        terminalCount !== parsed.data.tableRowCount
        || (isInFlight && (
            parsed.data.tableRowCount !== 0
            || parsed.data.providerRunIds.length !== 0
        ))
    ) throw new Error("RESEARCH_RUN_SHAPE_INVALID");
    return {
        category: parsed.data.category,
        city: parsed.data.city,
        country: parsed.data.country,
        createdAt,
        enrichmentColumns: parsed.data.enrichmentColumns,
        failCount: parsed.data.failCount,
        idempotencyKeyHash: parsed.data.idempotencyKeyHash,
        marketPodId: parsed.data.marketPodId,
        maxResults: parsed.data.maxResults,
        normalizedQuery: parsed.data.normalizedQuery,
        passCount: parsed.data.passCount,
        prompt: parsed.data.prompt,
        provider: parsed.data.provider,
        providerRunIds: parsed.data.providerRunIds,
        researchRunId: parsed.data.researchRunId,
        researchType: parsed.data.researchType,
        sourcePolicyId: parsed.data.sourcePolicyId,
        sourceTransparency: parsed.data.sourceTransparency,
        status: parsed.data.status,
        tableRowCount: parsed.data.tableRowCount,
        unsureCount: parsed.data.unsureCount,
        updatedAt,
    };
};

const researchEnrichmentSchema = z.object({
    key: z.string().trim().min(1).max(120),
    label: z.string().trim().min(1).max(160),
    sourceRef: nullableText(500),
    value: z.string().trim().max(500),
    verdict: z.enum(["pass", "fail", "unsure"]),
});
const researchRowSchema = z.object({
    actionabilityState: z.enum(["actionable", "verify", "research_only", "blocked"]),
    allowedRoute: z.enum(["email-export", "partner-intro", "pod-review", "none"]),
    allowedRouteReason: z.string().trim().max(500),
    category: nullableText(120),
    city: nullableText(120),
    contactability: targetContactability,
    country: nullableText(120),
    currentListGap: targetOpportunity,
    displayName: z.string().trim().min(2).max(180),
    enrichment: z.array(researchEnrichmentSchema).max(30),
    evidenceSummary: z.string().trim().max(2_000),
    fitDecision: z.enum(["pass", "fail", "unsure"]),
    fitScore: z.number().min(0).max(100),
    hardGateFailures: z.array(z.string().trim().min(1).max(500)).max(30),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    provider: researchProvider,
    providerRecordUrl: nullableHttpUrl,
    recommendedChannel: z.enum(["email-export", "partner-intro", "pod-review", "hold"]).optional(),
    recommendedCta: z.string().trim().max(500),
    recommendedMessageAngle: z.string().trim().max(1_000),
    recommendedNextAction: z.enum(["score", "evidence", "hold", "partner-review", "pod-review"]),
    researchRowId: z.string().trim().min(3).max(160),
    researchRunId: z.string().trim().min(3).max(160),
    routePermissionState: z.enum(["permissioned", "research_only", "blocked", "review_required", "expired"]),
    sourcePolicyId: nullableText(160),
    sourceRefs: z.array(z.string().trim().min(1).max(500)).max(30),
    sourceRunId: nullableText(160),
    targetId: nullableText(160),
    updatedAt: z.unknown(),
    website: nullableHttpUrl,
});

export const parseSignalDeskResearchRowDocument = (raw: unknown, documentId: string): SignalDeskResearchTableRowSummary => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("RESEARCH_ROW_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("RESEARCH_ROW_PRODUCT_MISMATCH");
    if (identity.researchRowId !== documentId) throw new Error("RESEARCH_ROW_IDENTITY_MISMATCH");
    const parsed = researchRowSchema.safeParse(raw);
    if (!parsed.success) throw new Error("RESEARCH_ROW_SHAPE_INVALID");
    const updatedAt = timestampToIso(parsed.data.updatedAt);
    if (!updatedAt) throw new Error("RESEARCH_ROW_SHAPE_INVALID");
    const fitDecisionMatchesScore = parsed.data.fitDecision === "pass"
        ? parsed.data.fitScore >= 72
        : parsed.data.fitDecision === "unsure"
            ? parsed.data.fitScore >= 45 && parsed.data.fitScore < 72
            : parsed.data.fitScore < 45 || parsed.data.hardGateFailures.length > 0;
    const failStateIsSafe = parsed.data.fitDecision !== "fail" || (
        parsed.data.allowedRoute === "none"
        && parsed.data.actionabilityState === "blocked"
        && parsed.data.recommendedNextAction === "hold"
    );
    if (!fitDecisionMatchesScore || !failStateIsSafe) throw new Error("RESEARCH_ROW_SHAPE_INVALID");
    return {
        actionabilityState: parsed.data.actionabilityState,
        allowedRoute: parsed.data.allowedRoute,
        allowedRouteReason: parsed.data.allowedRouteReason,
        category: parsed.data.category,
        city: parsed.data.city,
        contactability: parsed.data.contactability,
        country: parsed.data.country,
        currentListGap: parsed.data.currentListGap,
        displayName: parsed.data.displayName,
        enrichment: parsed.data.enrichment.map((entry) => ({
            key: entry.key,
            label: entry.label,
            sourceRef: entry.sourceRef,
            value: entry.value,
            verdict: entry.verdict,
        })),
        evidenceSummary: parsed.data.evidenceSummary,
        fitDecision: parsed.data.fitDecision,
        fitScore: parsed.data.fitScore,
        hardGateFailures: parsed.data.hardGateFailures,
        provider: parsed.data.provider,
        providerRecordUrl: parsed.data.providerRecordUrl,
        recommendedChannel: parsed.data.recommendedChannel,
        recommendedCta: parsed.data.recommendedCta,
        recommendedMessageAngle: parsed.data.recommendedMessageAngle,
        recommendedNextAction: parsed.data.recommendedNextAction,
        researchRowId: parsed.data.researchRowId,
        researchRunId: parsed.data.researchRunId,
        routePermissionState: parsed.data.routePermissionState,
        sourcePolicyId: parsed.data.sourcePolicyId,
        sourceRefs: parsed.data.sourceRefs,
        sourceRunId: parsed.data.sourceRunId,
        targetId: parsed.data.targetId,
        updatedAt,
        website: parsed.data.website,
    };
};
