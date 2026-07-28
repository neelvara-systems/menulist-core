import { normalizeStoreSwitchStoreId } from "@lib/multiOutlet/storeSwitchAccess";
import { getGrowthOSTimestampMillis } from "@lib/growthos/readiness";
import type { GrowthOSKitSummary, GrowthOSSummaryDocument } from "@type/growthos";
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

const timestampSchema = z.custom<NonNullable<GrowthOSKitSummary["expiresAt"]>>(
    (value) => getGrowthOSTimestampMillis(value) !== null,
);
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
