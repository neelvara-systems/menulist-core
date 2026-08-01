import { normalizeStoreSwitchStoreId } from "@lib/multiOutlet/storeSwitchAccess";
import { getGrowthOSTimestampMillis } from "@lib/growthos/readiness";
import type {
    GrowthOSExport,
    GrowthOSKit,
    GrowthOSKitSummary,
    GrowthOSReviewGuardResult,
    GrowthOSSummaryDocument,
} from "@type/growthos";
import { z } from "zod";

export type GrowthOSClientScope = {
    sId: string;
    tId: string;
};

export function getGrowthOSClientScope(input: {
    storeId: unknown;
    tenantId: unknown;
}): GrowthOSClientScope | null {
    const tenantId = normalizeStoreSwitchStoreId(input.tenantId);
    const storeId = normalizeStoreSwitchStoreId(input.storeId);
    if (!tenantId || !storeId) return null;
    return {
        sId: String(storeId),
        tId: String(tenantId),
    };
}

export function getGrowthOSSummaryCacheKey(
    scope: GrowthOSClientScope | null,
): readonly ["growthos-summary", string, string] | null {
    return scope ? ["growthos-summary", scope.tId, scope.sId] as const : null;
}

const timestampSchema = z.unknown().transform((value, context) => {
    const millis = getGrowthOSTimestampMillis(value);
    if (millis === null) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid timestamp" });
        return z.NEVER;
    }
    return new Date(millis).toISOString();
});
const readinessSchema = z.object({
    status: z.enum(["ready", "limited", "blocked", "stale"]),
    blocks: z.array(z.string().max(500)).max(50),
    warnings: z.array(z.string().max(500)).max(50),
});
const destinationSchema = z.enum([
    "whatsapp_status",
    "whatsapp_message",
    "instagram_caption",
    "google_update_draft",
    "staff_brief",
    "counter_prompt",
    "qr_table_prompt",
    "review_reply",
]);
const actionSchema = z.object({
    id: z.string().min(1).max(300),
    type: z.enum(["promote_item", "menu_event", "staff_push", "local_trust", "truth_fix", "review_reply"]),
    title: z.string().max(500),
    reason: z.string().max(1000),
    itemId: z.string().max(300).optional(),
    itemName: z.string().max(500).optional(),
    confidence: z.number().finite().min(0).max(1),
    destinations: z.array(destinationSchema).max(20),
    readiness: readinessSchema,
});
const outputSchema = z.object({
    id: z.string().min(1).max(300),
    destination: destinationSchema,
    label: z.string().max(500),
    text: z.string().max(20_000),
    preflight: readinessSchema,
    mainLine: z.string().max(2_000).optional(),
    reason: z.string().max(2_000).optional(),
    avoidLines: z.array(z.string().max(2_000)).max(50).optional(),
    menuLinkLine: z.string().max(2_000).optional(),
    counterPrompt: z.string().max(2_000).optional(),
    expiresAt: timestampSchema.nullable().optional(),
});
const kitSummarySchema = z.object({
    id: z.string().min(1).max(300),
    actionType: actionSchema.shape.type,
    title: z.string().max(500),
    itemName: z.string().max(500).optional(),
    outputs: z.array(outputSchema).max(20),
    sourceFactsHash: z.string().min(1).max(500),
    status: z.enum(["draft", "copied", "downloaded", "shared", "printed", "used", "archived"]),
    createdAt: timestampSchema.nullable().optional(),
    expiresAt: timestampSchema.nullable().optional(),
    isStale: z.boolean().optional(),
});
const sourceFactsSummarySchema = z.object({
    businessName: z.string().max(500),
    projectName: z.string().max(500),
    menuLink: z.string().max(2_000).optional(),
    itemCount: z.number().int().min(0).max(100_000),
    availableItemCount: z.number().int().min(0).max(100_000),
    unavailableItemNames: z.array(z.string().max(500)).max(1_000),
    promotedItemName: z.string().max(500).optional(),
    promotedItemPrice: z.number().finite().nullable().optional(),
    isOpenToday: z.boolean(),
    todayHoursLabel: z.string().max(500).optional(),
});
const kitSchema = kitSummarySchema.extend({
    tId: z.string().min(1).max(180),
    sId: z.string().min(1).max(180),
    projectId: z.string().min(1).max(300).optional(),
    actionId: z.string().min(1).max(300).optional(),
    operationId: z.string().min(1).max(300),
    destinationSet: z.array(destinationSchema).max(20),
    sourceFactsSummary: sourceFactsSummarySchema,
    aiOperationIds: z.array(z.string().min(1).max(300)).max(50).optional(),
    updatedAt: timestampSchema.nullable().optional(),
});
const summarySchema = z.object({
    tId: z.string(),
    sId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    lastUpdated: timestampSchema.nullable().optional(),
    sourceFactsHash: z.string().max(500).optional(),
    eligible: z.boolean(),
    reason: z.enum(["no_menu", "incomplete_truth", "not_entitled", "no_action"]).optional(),
    readiness: readinessSchema.optional(),
    primaryAction: actionSchema.nullable().optional(),
    secondaryActions: z.array(actionSchema).max(50),
    latestKit: kitSummarySchema.nullable().optional(),
});

export function projectGrowthOSSummaryForScope(
    value: unknown,
    scope: GrowthOSClientScope,
): GrowthOSSummaryDocument | null {
    try {
        const parsed = summarySchema.safeParse(value);
        if (!parsed.success) return null;
        if (parsed.data.tId !== scope.tId || parsed.data.sId !== scope.sId) return null;
        return parsed.data as GrowthOSSummaryDocument;
    } catch {
        return null;
    }
}

export function projectGrowthOSKitForScope(
    value: unknown,
    scope: GrowthOSClientScope,
): GrowthOSKit | null {
    try {
        const parsed = kitSchema.safeParse(value);
        if (!parsed.success) return null;
        if (parsed.data.tId !== scope.tId || parsed.data.sId !== scope.sId) return null;
        return parsed.data as GrowthOSKit;
    } catch {
        return null;
    }
}

const exportSchema = z.object({
    id: z.string().min(1).max(300),
    tId: z.string().min(1).max(180),
    sId: z.string().min(1).max(180),
    kitId: z.string().min(1).max(300),
    destination: destinationSchema,
    method: z.enum(["copy", "share", "download", "print", "mark_used", "regenerate", "stale"]),
    operationId: z.string().min(1).max(300),
    outputId: z.string().min(1).max(300).optional(),
    status: kitSummarySchema.shape.status.nullable().optional(),
    isStale: z.boolean(),
    uId: z.string().min(1).max(300),
    exportedAt: timestampSchema.nullable().optional(),
});

export function projectGrowthOSExportForScope(
    value: unknown,
    scope: GrowthOSClientScope,
): GrowthOSExport | null {
    try {
        const parsed = exportSchema.safeParse(value);
        if (!parsed.success) return null;
        if (parsed.data.tId !== scope.tId || parsed.data.sId !== scope.sId) return null;
        return parsed.data as GrowthOSExport;
    } catch {
        return null;
    }
}

const exportResultSchema = z.object({
    exportId: z.string().min(1).max(300),
    isStale: z.boolean(),
    status: kitSummarySchema.shape.status.nullable().optional(),
});

export function projectGrowthOSExportResult(value: unknown): {
    exportId: string;
    isStale: boolean;
    status?: GrowthOSKit["status"] | null;
} | null {
    const parsed = exportResultSchema.safeParse(value);
    if (
        !parsed.success
        || typeof parsed.data.exportId !== "string"
        || typeof parsed.data.isStale !== "boolean"
    ) return null;
    return {
        exportId: parsed.data.exportId,
        isStale: parsed.data.isStale,
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    };
}

const reviewGuardResultSchema = z.object({
    risk: z.enum([
        "positive",
        "neutral",
        "negative",
        "volatile",
        "food_safety",
        "legal_or_threatening",
        "abusive",
        "unclear",
    ]),
    publicReplyRecommended: z.boolean(),
    recommendation: z.string().min(1).max(4_000),
    reply: z.string().max(8_000).optional(),
    privateRecoveryMessage: z.string().max(8_000).optional(),
    internalCheckLine: z.string().max(4_000).optional(),
});

export function projectGrowthOSReviewGuardResult(
    value: unknown,
): GrowthOSReviewGuardResult | null {
    const parsed = reviewGuardResultSchema.safeParse(value);
    if (
        !parsed.success
        || typeof parsed.data.risk !== "string"
        || typeof parsed.data.publicReplyRecommended !== "boolean"
        || typeof parsed.data.recommendation !== "string"
    ) return null;
    return {
        risk: parsed.data.risk,
        publicReplyRecommended: parsed.data.publicReplyRecommended,
        recommendation: parsed.data.recommendation,
        ...(parsed.data.reply !== undefined ? { reply: parsed.data.reply } : {}),
        ...(parsed.data.privateRecoveryMessage !== undefined
            ? { privateRecoveryMessage: parsed.data.privateRecoveryMessage }
            : {}),
        ...(parsed.data.internalCheckLine !== undefined
            ? { internalCheckLine: parsed.data.internalCheckLine }
            : {}),
    };
}
