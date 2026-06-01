import { buildPreflight } from "@lib/growthos/outputGuard";
import type { GrowthOSPreflightResult, GrowthOSSourceFacts } from "@type/growthos";

export function computeGrowthOSReadiness(facts: GrowthOSSourceFacts): GrowthOSPreflightResult {
    const blocks: string[] = [];
    const warnings: string[] = [];
    const availableItems = facts.items.filter((item) => item.available);

    if (!facts.items.length) {
        blocks.push("No menu items are available for Growth Kits.");
    }

    if (!availableItems.length && facts.items.length) {
        blocks.push("No available menu item can be suggested today.");
    }

    if (!facts.menuLink) {
        warnings.push("Public menu link is missing.");
    }

    if (!facts.isOpenToday) {
        warnings.push("Store is marked closed today.");
    }

    return buildPreflight(blocks, warnings);
}

export function isGrowthOSKitExpired(expiresAt?: any): boolean {
    if (!expiresAt) return false;
    const expiryMs = typeof expiresAt?.toMillis === "function"
        ? expiresAt.toMillis()
        : typeof expiresAt?.toDate === "function"
            ? expiresAt.toDate().getTime()
            : new Date(expiresAt).getTime();
    return Number.isFinite(expiryMs) && expiryMs <= Date.now();
}
