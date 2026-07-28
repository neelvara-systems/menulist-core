import { FEATURE_FLAGS } from "@config/features";
import { GROWTHOS_CORE_DESTINATIONS, GROWTHOS_MAX_ACTIONS } from "@constant/growthos";
import { computeGrowthOSReadiness } from "@lib/growthos/readiness";
import type { GrowthOSActionSummary, GrowthOSMenuItemFact, GrowthOSSourceFacts } from "@type/growthos";

function scoreItem(item: GrowthOSMenuItemFact, index: number): number {
    let score = 0.5;
    if (item.available) score += 0.2;
    if (item.isBestSeller) score += 0.15;
    if (item.isNew) score += 0.1;
    if (item.imageUrl) score += 0.05;
    if (item.price != null) score += 0.03;
    score -= Math.min(index * 0.01, 0.08);
    return Math.max(0.1, Math.min(score, 0.95));
}

function actionTitleForItem(item: GrowthOSMenuItemFact): string {
    if (item.isNew) return `Share ${item.name} today`;
    if (item.isBestSeller) return `Keep ${item.name} visible today`;
    return `Share ${item.name} today`;
}

export function rankGrowthOSActions(facts: GrowthOSSourceFacts): GrowthOSActionSummary[] {
    const readiness = computeGrowthOSReadiness(facts);
    if (readiness.status === "blocked") return [];
    const destinations = (FEATURE_FLAGS as any).GROWTHOS_STAFF_BRIEF_MODE === "deterministic"
        ? GROWTHOS_CORE_DESTINATIONS
        : GROWTHOS_CORE_DESTINATIONS.filter((destination) => destination !== "staff_brief");

    return facts.items
        .map((item, index) => ({ item, index, score: scoreItem(item, index) }))
        .filter(({ item }) => item.available)
        .sort((a, b) => b.score - a.score)
        .slice(0, GROWTHOS_MAX_ACTIONS)
        .map(({ item, score }) => ({
            id: `${facts.projectId}_${item.id}_promote_item`,
            type: item.isNew ? "menu_event" : "promote_item",
            title: actionTitleForItem(item),
            reason: item.isBestSeller
                ? "This item is marked as a current customer favorite."
                : item.isNew
                    ? "This item looks new and is available now."
                    : "This available item is ready to share from the current menu.",
            itemId: item.id,
            itemName: item.name,
            confidence: Number(score.toFixed(2)),
            destinations,
            readiness,
        }));
}

export function findGrowthOSAction(
    actions: GrowthOSActionSummary[],
    actionId?: string,
): GrowthOSActionSummary | null {
    if (!actions.length) return null;
    if (actionId) {
        return actions.find((action) => action.id === actionId) || null;
    }
    return actions[0];
}
