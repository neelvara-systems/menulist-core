import { formatGrowthOSPrice } from "@lib/growthos/sourceFacts";
import { guardGrowthOSOutput } from "@lib/growthos/outputGuard";
import type {
    GrowthOSActionSummary,
    GrowthOSMenuItemFact,
    GrowthOSSourceFacts,
    GrowthOSStaffBriefOutput,
    GrowthOSTimestampLike,
} from "@type/growthos";

export function buildGrowthOSStaffBrief(params: {
    action: GrowthOSActionSummary;
    facts: GrowthOSSourceFacts;
    item?: GrowthOSMenuItemFact | null;
    expiresAt?: GrowthOSTimestampLike | null;
}): GrowthOSStaffBriefOutput {
    const item = params.item;
    const price = item ? formatGrowthOSPrice(item) : "";
    const avoidLines = params.facts.items
        .filter((candidate) => !candidate.available)
        .slice(0, 3)
        .map((candidate) => `Do not suggest ${candidate.name}. It is unavailable today.`);
    const mainLine = item
        ? `Suggest ${item.name}${price ? ` (${price})` : ""} for customers asking what to try today.`
        : "Use the current menu link when customers ask what is available today.";
    const menuLinkLine = params.facts.menuLink
        ? `For the full menu, share: ${params.facts.menuLink}`
        : "Use the menu from MenuList before sharing item details.";
    const counterPrompt = item
        ? `Ask us about ${item.name} today.`
        : "Ask us for today's available menu.";
    const guarded = guardGrowthOSOutput([mainLine, ...avoidLines, menuLinkLine].join(" "));

    return {
        id: "staff_brief",
        destination: "staff_brief",
        label: "Staff brief",
        text: guarded.text,
        mainLine,
        reason: params.action.reason,
        avoidLines,
        menuLinkLine,
        counterPrompt,
        expiresAt: params.expiresAt,
        preflight: guarded.preflight,
    };
}
