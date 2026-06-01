import { getStoreContextName } from "@lib/businessIdentity/names";
import { generateProjectUrl } from "@lib/utils/slugify";
import { GROWTHOS_MAX_UNAVAILABLE_ITEMS } from "@constant/growthos";
import type {
    GrowthOSMenuItemFact,
    GrowthOSSourceFacts,
    GrowthOSSourceFactsSummary,
} from "@type/growthos";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function resolveText(value: unknown, fallback = ""): string {
    if (typeof value === "string") return value.trim() || fallback;
    if (value && typeof value === "object") {
        const first = Object.values(value as Record<string, unknown>).find((entry) => typeof entry === "string" && entry.trim());
        return typeof first === "string" ? first.trim() : fallback;
    }
    return fallback;
}

function parsePrice(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = Number(value.match(/\d+(?:\.\d+)?/)?.[0]);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function getTodayHoursLabel(storeData: any): { isOpenToday: boolean; label?: string } {
    const todayKey = DAY_KEYS[new Date().getDay()];
    const value = storeData?.workingHours?.[todayKey];
    if (!value || String(value).toLowerCase() === "closed") {
        return { isOpenToday: false, label: "Closed today" };
    }
    return { isOpenToday: true, label: String(value).replace("-", " - ") };
}

function buildMenuLink(storeData: any, projectName: string): string | undefined {
    if (!storeData?.subdomain && !storeData?.customDomain) return undefined;
    try {
        return generateProjectUrl(storeData.subdomain, storeData.customDomain, projectName, false);
    } catch {
        return undefined;
    }
}

function extractMenuItems(projectData: any, currencySymbol?: string): GrowthOSMenuItemFact[] {
    const items: GrowthOSMenuItemFact[] = [];
    for (const file of projectData?.files || []) {
        for (const item of file?.extractedData?.data?.items || []) {
            const name = resolveText(item?.name, "Menu item");
            items.push({
                id: String(item?.id || `${name}-${items.length}`),
                name,
                categoryName: resolveText(item?.category, ""),
                available: item?.available !== false,
                price: parsePrice(item?.price),
                currencySymbol,
                imageUrl: item?.images?.[0]?.url || item?.imageUrl,
                isBestSeller: item?.isBestSeller === true,
                isNew: item?.isNew === true || item?.newItem === true,
            });
        }
    }
    return items;
}

function stableStringify(value: unknown): string {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    const entries = Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`);
    return `{${entries.join(",")}}`;
}

export function hashGrowthOSSourceFacts(facts: GrowthOSSourceFacts): string {
    const hashInput = stableStringify({
        projectId: facts.projectId,
        menuLink: facts.menuLink || null,
        todayHoursLabel: facts.todayHoursLabel || null,
        isOpenToday: facts.isOpenToday,
        items: facts.items.map((item) => ({
            id: item.id,
            name: item.name,
            available: item.available,
            price: item.price ?? null,
        })),
    });

    let hash = 5381;
    for (let index = 0; index < hashInput.length; index += 1) {
        hash = ((hash << 5) + hash) + hashInput.charCodeAt(index);
        hash &= 0xffffffff;
    }
    return `g${(hash >>> 0).toString(36)}`;
}

export function buildGrowthOSSourceFacts(params: {
    projectData: any;
    projectId: string;
    storeData: any;
    tId: string | number;
    sId: string | number;
}): GrowthOSSourceFacts {
    const projectName = resolveText(params.projectData?.name, resolveText(params.projectData?.projectName, "your menu"));
    const currencySymbol = params.storeData?.currencySymbol || "₹";
    const hours = getTodayHoursLabel(params.storeData);
    return {
        tId: String(params.tId),
        sId: String(params.sId),
        projectId: params.projectId,
        businessName: getStoreContextName(params.storeData, "Business"),
        projectName,
        businessType: params.storeData?.businessType || params.projectData?.businessType,
        menuLink: buildMenuLink(params.storeData, projectName),
        currencySymbol,
        todayHoursLabel: hours.label,
        isOpenToday: hours.isOpenToday,
        items: extractMenuItems(params.projectData, currencySymbol),
        generatedForDate: new Date().toISOString().split("T")[0],
    };
}

export function summarizeGrowthOSSourceFacts(
    facts: GrowthOSSourceFacts,
    promotedItem?: GrowthOSMenuItemFact | null,
): GrowthOSSourceFactsSummary {
    const availableItems = facts.items.filter((item) => item.available);
    return {
        businessName: facts.businessName,
        projectName: facts.projectName,
        menuLink: facts.menuLink,
        itemCount: facts.items.length,
        availableItemCount: availableItems.length,
        unavailableItemNames: facts.items
            .filter((item) => !item.available)
            .slice(0, GROWTHOS_MAX_UNAVAILABLE_ITEMS)
            .map((item) => item.name),
        promotedItemName: promotedItem?.name,
        promotedItemPrice: promotedItem?.price ?? null,
        isOpenToday: facts.isOpenToday,
        todayHoursLabel: facts.todayHoursLabel,
    };
}

export function formatGrowthOSPrice(item: GrowthOSMenuItemFact): string {
    if (item.price == null) return "";
    return `${item.currencySymbol || "₹"}${item.price}`;
}
