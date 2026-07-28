import type {
    PublicTruthMonitorEntitlementResult,
    PublicTruthMonitorSummaryDocument,
} from "@type/publicTruthMonitor";
import { z } from "zod";

const boundedText = z.string().max(2_048);
const canonicalScopeId = z.string().regex(/^[1-9]\d*$/).max(64);
const nonNegativeCount = z.number().int().min(0).max(10_000);

const sourceBoundarySchema = z.object({
    aiOrSearchChecked: z.literal(false),
    externalPlatformMutation: z.literal(false),
    externalSourcesFetched: z.literal(false),
    publicRouteAdded: z.literal(false),
    rankingPromise: z.literal(false),
}).strict();

const moduleIdSchema = z.enum([
    "public_truth_basics",
    "business_facts_copy_pack",
    "qr_link_health",
    "menu_service_readability",
    "price_availability_gap",
    "menu_pdf_cleanup",
    "whatsapp_action_link",
    "whatsapp_reply_pack",
    "hours_readiness",
    "photo_visual_identity",
    "customer_question_coverage",
    "customer_faq_reply_pack",
    "booking_inquiry_readiness",
    "google_profile_handoff",
    "customer_link_preview",
    "social_bio_link_consistency",
    "print_share_assets",
    "menu_freshness",
]);

const moduleSnapshotSchema = z.object({
    actionLabel: boundedText,
    evidenceText: boundedText,
    fixHref: boundedText,
    id: moduleIdSchema,
    mobileFixTarget: z.enum([
        "basic_settings",
        "domain_settings",
        "hours_edit",
        "menu_tab",
        "official_page",
        "presence_monitor",
        "share_tab",
    ]),
    status: z.enum(["ready", "needs_attention", "check", "not_checked"]),
    title: boundedText,
}).strict();

const primaryFixSchema = moduleSnapshotSchema.omit({
    mobileFixTarget: true,
    status: true,
});

const historyEntrySchema = z.object({
    checkedProjectName: boundedText.optional(),
    generatedAt: z.string().datetime(),
    id: z.string().min(1).max(160),
    moduleSummaries: z.array(moduleSnapshotSchema).max(32),
    notCheckedFactCount: nonNegativeCount,
    primaryFix: primaryFixSchema.optional(),
    publicLinks: z.object({
        menuUrl: z.string().url().max(2_048).optional(),
        officialPageUrl: z.string().url().max(2_048).optional(),
    }).strict(),
    readyModuleCount: nonNegativeCount,
    sourceBoundary: sourceBoundarySchema,
    sourceSummary: z.object({
        activeProjectCount: nonNegativeCount,
        checkedProjectName: boundedText.optional(),
        domainState: z.enum([
            "custom_domain_live",
            "custom_domain_pending",
            "subdomain_live",
            "missing",
        ]),
        externalSourcesFetched: z.literal(false),
        projectDataChecked: z.boolean(),
    }).strict(),
    setupJobCount: nonNegativeCount,
    setupJobs: z.array(moduleSnapshotSchema).max(6),
    status: z.enum([
        "ready",
        "missing_basics",
        "unclear",
        "not_checked",
        "manual_review_needed",
    ]),
    totalModuleCount: nonNegativeCount,
    unclearFactCount: nonNegativeCount,
    missingFactCount: nonNegativeCount,
}).strict().superRefine((entry, context) => {
    if (entry.readyModuleCount > entry.totalModuleCount) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "ready module count exceeds total module count",
            path: ["readyModuleCount"],
        });
    }
    if (entry.setupJobCount !== entry.setupJobs.length) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "setup job count does not match setup jobs",
            path: ["setupJobCount"],
        });
    }
});

const entitlementSchema = z.object({
    allowed: z.boolean(),
    message: boundedText,
    mode: z.enum(["disabled", "pilot", "paid"]),
    reason: z.enum([
        "feature_off",
        "access_disabled",
        "not_pilot_store",
        "not_paid",
        "allowed",
    ]),
}).strict();

const summarySchema = z.object({
    cadence: z.enum(["manual", "monthly"]),
    entitlement: z.object({
        allowed: z.boolean(),
        checkedAt: z.string().datetime(),
        mode: z.enum(["disabled", "pilot", "paid"]),
        reason: z.enum([
            "feature_off",
            "access_disabled",
            "not_pilot_store",
            "not_paid",
            "allowed",
        ]),
    }).strict().optional(),
    generatedBy: z.object({
        source: z.literal("manual_owner"),
        userId: z.string().min(1).max(256).optional(),
    }).strict().optional(),
    history: z.array(historyEntrySchema).max(12),
    historyLimit: z.number().int().min(1).max(12),
    latest: historyEntrySchema.nullable(),
    nextScheduledAt: z.string().datetime().nullable().optional(),
    sId: canonicalScopeId,
    sourceBoundary: sourceBoundarySchema,
    status: z.enum(["ready", "not_ready"]),
    tId: canonicalScopeId,
}).strip().superRefine((summary, context) => {
    if (summary.history.length > summary.historyLimit) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "history exceeds configured history limit",
            path: ["history"],
        });
    }
    if (summary.latest && summary.history[0]?.id !== summary.latest.id) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "latest report does not match the first history entry",
            path: ["latest"],
        });
    }
    if (!summary.latest && summary.history.length > 0) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "history cannot exist without a latest report",
            path: ["latest"],
        });
    }
});

const responseEnvelopeSchema = z.object({
    data: z.object({
        entitlement: entitlementSchema,
        summary: summarySchema.nullable(),
    }).strip(),
}).strip();

export interface PublicTruthMonitorClientScope {
    storeId: string;
    tenantId: string;
}

export interface PublicTruthMonitorClientData {
    entitlement: PublicTruthMonitorEntitlementResult;
    summary: PublicTruthMonitorSummaryDocument | null;
}

function normalizeScopeId(value: unknown): string | null {
    if (typeof value === "number") {
        return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
    }
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || value.length > 64) {
        return null;
    }
    return value;
}

export function getPublicTruthMonitorClientScope(
    tenantId: unknown,
    storeId: unknown,
): PublicTruthMonitorClientScope | null {
    const normalizedTenantId = normalizeScopeId(tenantId);
    const normalizedStoreId = normalizeScopeId(storeId);
    if (!normalizedTenantId || !normalizedStoreId) return null;
    return {
        storeId: normalizedStoreId,
        tenantId: normalizedTenantId,
    };
}

export function getPublicTruthMonitorClientCacheKey(
    scope: PublicTruthMonitorClientScope,
): readonly ["publicTruthMonitorSummary", string, string] {
    return ["publicTruthMonitorSummary", scope.tenantId, scope.storeId] as const;
}

function hasRequiredClientData(
    value: z.infer<typeof responseEnvelopeSchema>["data"],
): value is PublicTruthMonitorClientData {
    const entitlement = value.entitlement;
    const summary = value.summary;
    return Boolean(
        entitlement
        && typeof entitlement.allowed === "boolean"
        && typeof entitlement.message === "string"
        && typeof entitlement.mode === "string"
        && typeof entitlement.reason === "string"
        && (
            summary === null
            || (
                summary
                && typeof summary.tId === "string"
                && typeof summary.sId === "string"
                && Array.isArray(summary.history)
                && typeof summary.historyLimit === "number"
                && Object.prototype.hasOwnProperty.call(summary, "latest")
            )
        )
    );
}

export function parsePublicTruthMonitorClientData(
    payload: unknown,
    expectedScope: PublicTruthMonitorClientScope,
): PublicTruthMonitorClientData {
    const parsed = responseEnvelopeSchema.parse(payload).data;
    if (!hasRequiredClientData(parsed)) {
        throw new Error("Public truth monitor response is incomplete");
    }
    if (
        parsed.summary
        && (
            parsed.summary.tId !== expectedScope.tenantId
            || parsed.summary.sId !== expectedScope.storeId
        )
    ) {
        throw new Error("Public truth monitor response scope mismatch");
    }
    return parsed;
}
