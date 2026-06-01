import { isGrowthOSKitExpired } from "@lib/growthos/readiness";
import type { GrowthOSActionSummary, GrowthOSKitSummary, GrowthOSSummaryDocument } from "@type/growthos";

export type GrowthOSTodayTriggerReason =
    | "fresh_pack_ready"
    | "used_pack_stale"
    | "strong_menu_action"
    | "none";

export interface GrowthOSTodayTriggerState {
    reason: GrowthOSTodayTriggerReason;
    shouldSurface: boolean;
}

const USED_KIT_STATUSES = new Set(["copied", "downloaded", "printed", "shared", "used"]);

export function isGrowthOSSummaryKitStale(summary?: GrowthOSSummaryDocument | null): boolean {
    const latestKit = summary?.latestKit;
    if (!latestKit) return false;
    return Boolean(latestKit.isStale)
        || Boolean(latestKit.sourceFactsHash && summary?.sourceFactsHash && latestKit.sourceFactsHash !== summary.sourceFactsHash)
        || isGrowthOSKitExpired(latestKit.expiresAt);
}

function isOwnerTouchedKit(latestKit?: GrowthOSKitSummary | null): boolean {
    if (!latestKit) return false;
    return USED_KIT_STATUSES.has(String(latestKit.status || ""));
}

function isStrongMenuAction(action?: GrowthOSActionSummary | null): boolean {
    if (!action || action.readiness?.status === "blocked") return false;
    const reason = String(action.reason || "").toLowerCase();
    return action.type === "menu_event"
        || reason.includes("customer favorite")
        || action.confidence >= 0.88;
}

export function getGrowthOSTodayTriggerState(summary?: GrowthOSSummaryDocument | null): GrowthOSTodayTriggerState {
    const latestKit = summary?.latestKit || null;
    const latestKitStale = isGrowthOSSummaryKitStale(summary);

    if (latestKit && !latestKitStale && latestKit.status !== "archived") {
        return { reason: "fresh_pack_ready", shouldSurface: true };
    }

    if (latestKitStale && isOwnerTouchedKit(latestKit)) {
        return { reason: "used_pack_stale", shouldSurface: true };
    }

    if (isStrongMenuAction(summary?.primaryAction)) {
        return { reason: "strong_menu_action", shouldSurface: true };
    }

    return { reason: "none", shouldSurface: false };
}
