import { getStoreContextName } from "@lib/businessIdentity/names";
import { generateProjectUrl } from "@lib/utils/slugify";
import { GROWTHOS_MAX_UNAVAILABLE_ITEMS } from "@constant/growthos";
import type {
    GrowthOSMenuItemFact,
    GrowthOSSourceFacts,
    GrowthOSSourceFactsSummary,
} from "@type/growthos";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function resolveText(value: unknown, fallback = ""): string {
    if (typeof value === "string") return value.trim() || fallback;
    if (value && typeof value === "object") {
        try {
            const first = Object.values(asRecord(value)).find((entry) => typeof entry === "string" && entry.trim());
            return typeof first === "string" ? first.trim() : fallback;
        } catch {
            return fallback;
        }
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

function getTodayHoursLabel(storeData: unknown): { isOpenToday: boolean; label?: string } {
    const todayKey = DAY_KEYS[new Date().getDay()];
    const workingHours = asRecord(asRecord(storeData).workingHours);
    const value = workingHours[todayKey];
    if (typeof value !== "string" || !value.trim()) {
        return { isOpenToday: false };
    }
    if (value.trim().toLowerCase() === "closed") {
        return { isOpenToday: false, label: "Closed today" };
    }
    return { isOpenToday: true, label: value.trim().replace("-", " - ") };
}

function buildMenuLink(storeData: unknown, projectName: string): string | undefined {
    const store = asRecord(storeData);
    const subdomain = typeof store.subdomain === "string" ? store.subdomain : "";
    const customDomain = typeof store.customDomain === "string" ? store.customDomain : "";
    if (!subdomain && !customDomain) return undefined;
    try {
        return generateProjectUrl(subdomain, customDomain, projectName, false);
    } catch {
        return undefined;
    }
}

function extractMenuItems(projectData: unknown, currencySymbol?: string): GrowthOSMenuItemFact[] {
    const items: GrowthOSMenuItemFact[] = [];
    const files = asRecord(projectData).files;
    for (const fileValue of Array.isArray(files) ? files : []) {
        const file = asRecord(fileValue);
        const extractedData = asRecord(file.extractedData);
        const data = asRecord(extractedData.data);
        const rawItems = data.items;
        for (const itemValue of Array.isArray(rawItems) ? rawItems : []) {
            const item = asRecord(itemValue);
            const name = resolveText(item.name, "Menu item");
            const images = Array.isArray(item.images) ? item.images : [];
            const firstImage = asRecord(images[0]);
            const rawId = item.id;
            items.push({
                id: typeof rawId === "string" || typeof rawId === "number"
                    ? String(rawId)
                    : `${name}-${items.length}`,
                name,
                categoryName: resolveText(item.category, ""),
                available: item.available !== false,
                price: parsePrice(item.price),
                currencySymbol,
                imageUrl: resolveText(firstImage.url || item.imageUrl, "") || undefined,
                isBestSeller: item.isBestSeller === true,
                isNew: item.isNew === true || item.newItem === true,
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
        businessName: facts.businessName,
        projectName: facts.projectName,
        businessType: facts.businessType || null,
        menuLink: facts.menuLink || null,
        currencySymbol: facts.currencySymbol || null,
        todayHoursLabel: facts.todayHoursLabel || null,
        isOpenToday: facts.isOpenToday,
        items: facts.items.map((item) => ({
            id: item.id,
            name: item.name,
            categoryName: item.categoryName || null,
            available: item.available,
            price: item.price ?? null,
            currencySymbol: item.currencySymbol || null,
            imageUrl: item.imageUrl || null,
            isBestSeller: item.isBestSeller === true,
            isNew: item.isNew === true,
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
    projectData: unknown;
    projectId: string;
    storeData: unknown;
    tId: string | number;
    sId: string | number;
}): GrowthOSSourceFacts {
    const project = asRecord(params.projectData);
    const store = asRecord(params.storeData);
    const projectName = resolveText(project.name, resolveText(project.projectName, "your menu"));
    const currencySymbol = resolveText(store.currencySymbol, "₹");
    const hours = getTodayHoursLabel(params.storeData);
    return {
        tId: String(params.tId),
        sId: String(params.sId),
        projectId: params.projectId,
        businessName: getStoreContextName(params.storeData, "Business"),
        projectName,
        businessType: resolveText(store.businessType || project.businessType, "") || undefined,
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
