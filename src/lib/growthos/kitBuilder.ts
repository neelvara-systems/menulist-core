import { FEATURE_FLAGS } from "@config/features";
import { GROWTHOS_DESTINATION_LABELS, GROWTHOS_KIT_TTL_HOURS } from "@constant/growthos";
import { guardGrowthOSOutput } from "@lib/growthos/outputGuard";
import { buildGrowthOSStaffBrief } from "@lib/growthos/staffBrief";
import { formatGrowthOSPrice, hashGrowthOSSourceFacts, summarizeGrowthOSSourceFacts } from "@lib/growthos/sourceFacts";
import type {
    GrowthOSActionSummary,
    GrowthOSDestination,
    GrowthOSKit,
    GrowthOSMenuItemFact,
    GrowthOSOutput,
    GrowthOSSourceFacts,
} from "@type/growthos";

function resolveItem(facts: GrowthOSSourceFacts, action: GrowthOSActionSummary): GrowthOSMenuItemFact | null {
    return facts.items.find((item) => item.id === action.itemId) || facts.items.find((item) => item.available) || null;
}

function buildLine(params: {
    destination: GrowthOSDestination;
    facts: GrowthOSSourceFacts;
    item: GrowthOSMenuItemFact | null;
}): string {
    const { destination, facts, item } = params;
    const itemName = item?.name || "today's menu";
    const price = item ? formatGrowthOSPrice(item) : "";
    const itemWithPrice = `${itemName}${price ? ` (${price})` : ""}`;
    const linkLine = facts.menuLink ? ` View the menu: ${facts.menuLink}` : "";
    const hoursLine = facts.todayHoursLabel ? ` Today's hours: ${facts.todayHoursLabel}.` : "";
    const availabilityLabel = facts.isOpenToday ? "Available today" : "On the menu";
    const menuLabel = facts.isOpenToday ? "On the menu today" : "On the menu";

    if (destination === "whatsapp_status") {
        return `${facts.businessName}: ${availabilityLabel} - ${itemWithPrice}.${linkLine}`;
    }
    if (destination === "whatsapp_message") {
        return `Hi, ${facts.businessName} has ${itemWithPrice} ${facts.isOpenToday ? "available today" : "on the menu"}.${linkLine}`;
    }
    if (destination === "instagram_caption") {
        return `${menuLabel} at ${facts.businessName}: ${itemWithPrice}.${linkLine}`;
    }
    if (destination === "google_update_draft") {
        return `${facts.businessName} menu update: ${itemWithPrice} ${facts.isOpenToday ? "available today" : "on the menu"}.${hoursLine}${linkLine}`;
    }
    if (destination === "counter_prompt") {
        return `Ask us about ${itemName} today.${linkLine}`;
    }
    if (destination === "qr_table_prompt") {
        return `Scan the menu and ask for ${itemName} if it is available.${linkLine}`;
    }
    return `${itemName} is available today.${linkLine}`;
}

function makeOutput(destination: GrowthOSDestination, text: string): GrowthOSOutput {
    const guarded = guardGrowthOSOutput(text);
    return {
        id: destination,
        destination,
        label: GROWTHOS_DESTINATION_LABELS[destination],
        text: guarded.text,
        preflight: guarded.preflight,
    };
}

export function buildGrowthOSKit(params: {
    action: GrowthOSActionSummary;
    facts: GrowthOSSourceFacts;
    kitId: string;
    operationId: string;
    now?: Date;
    timestampFactory?: (date: Date) => any;
}): GrowthOSKit {
    const now = params.now || new Date();
    const expiresDate = new Date(now.getTime() + GROWTHOS_KIT_TTL_HOURS * 60 * 60 * 1000);
    const createdAt = params.timestampFactory ? params.timestampFactory(now) : now.toISOString();
    const expiresAt = params.timestampFactory ? params.timestampFactory(expiresDate) : expiresDate.toISOString();
    const item = resolveItem(params.facts, params.action);
    const textDestinations: GrowthOSDestination[] = [
        "whatsapp_status",
        "whatsapp_message",
        "instagram_caption",
        "google_update_draft",
        "counter_prompt",
        "qr_table_prompt",
    ];
    const outputs: GrowthOSOutput[] = textDestinations.map((destination) => (
        makeOutput(destination, buildLine({ destination, facts: params.facts, item }))
    ));

    if (params.action.destinations.includes("staff_brief") && (FEATURE_FLAGS as any).GROWTHOS_STAFF_BRIEF_MODE === "deterministic") {
        outputs.push(buildGrowthOSStaffBrief({
            action: params.action,
            facts: params.facts,
            item,
            expiresAt,
        }));
    }

    const sourceFactsHash = hashGrowthOSSourceFacts(params.facts);
    return {
        id: params.kitId,
        tId: params.facts.tId,
        sId: params.facts.sId,
        projectId: params.facts.projectId,
        actionId: params.action.id,
        operationId: params.operationId,
        actionType: params.action.type,
        title: params.action.title,
        itemName: item?.name,
        destinationSet: outputs.map((output) => output.destination),
        sourceFactsHash,
        sourceFactsSummary: summarizeGrowthOSSourceFacts(params.facts, item),
        outputs,
        status: "draft",
        createdAt,
        updatedAt: createdAt,
        expiresAt,
        isStale: false,
    };
}
