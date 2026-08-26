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

    if (!facts.todayHoursLabel) {
        warnings.push("Business hours are missing.");
    } else if (!facts.isOpenToday) {
        warnings.push("Store is marked closed today.");
    }

    return buildPreflight(blocks, warnings);
}

export function getGrowthOSTimestampMillis(value: unknown): number | null {
    if (value == null) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
        const millis = Date.parse(value);
        return Number.isFinite(millis) ? millis : null;
    }
    if (value instanceof Date) {
        const millis = value.getTime();
        return Number.isFinite(millis) ? millis : null;
    }
    if (typeof value !== "object") return null;

    try {
        const timestamp = value as { toDate?: unknown; toMillis?: unknown };
        const toMillis = timestamp.toMillis;
        if (typeof toMillis === "function") {
            const millis = toMillis.call(value);
            return typeof millis === "number" && Number.isFinite(millis) ? millis : null;
        }
        const toDate = timestamp.toDate;
        if (typeof toDate === "function") {
            const date = toDate.call(value);
            if (!(date instanceof Date)) return null;
            const millis = date.getTime();
            return Number.isFinite(millis) ? millis : null;
        }
    } catch {
        return null;
    }
    return null;
}

export function isGrowthOSKitExpired(expiresAt?: unknown): boolean {
    const expiryMs = getGrowthOSTimestampMillis(expiresAt);
    return expiryMs !== null && expiryMs <= Date.now();
}
