import type { MenuItemForSlide } from "@type/campaigns";

const SCREEN_TEXT_MAX_DEFAULT = 120;
const OWNER_CAPTION_MAX = 48;
const SCREEN_MENU_PROJECTION_ITEM_LIMIT = 200;

const LOCALIZED_TEXT_KEYS = [
    "en",
    "en-US",
    "en-IN",
    "default",
    "name",
    "title",
    "label",
    "value",
];

const TECHNICAL_CATEGORY_PATTERN = /^(cat|category|menu|section|item)[_-]?[a-z0-9_-]{4,}$/i;
const UUID_LIKE_PATTERN = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export function resolveScreenText(value: unknown, fallback = ""): string {
    let raw = "";

    if (typeof value === "string" || typeof value === "number") {
        raw = String(value);
    } else if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        for (const key of LOCALIZED_TEXT_KEYS) {
            const candidate = record[key];
            if (typeof candidate === "string" && candidate.trim()) {
                raw = candidate;
                break;
            }
        }

        if (!raw) {
            const candidate = Object.values(record).find(
                (entry) => typeof entry === "string" && entry.trim().length > 0,
            );
            raw = typeof candidate === "string" ? candidate : "";
        }
    }

    const cleaned = raw
        .replace(/<[^>]*>/g, " ")
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return cleaned || fallback;
}

export function truncateScreenText(value: unknown, maxLength = SCREEN_TEXT_MAX_DEFAULT, fallback = ""): string {
    const text = resolveScreenText(value, fallback);
    if (text.length <= maxLength) return text;

    const hardCut = text.slice(0, Math.max(0, maxLength - 3));
    const lastSpace = hardCut.lastIndexOf(" ");
    const cut = lastSpace >= Math.floor(maxLength * 0.6) ? hardCut.slice(0, lastSpace) : hardCut;
    return `${cut.trim()}...`;
}

export function parseScreenPrice(value: unknown): number | undefined {
    if (typeof value === "number") {
        return Number.isFinite(value) && value > 0 ? value : undefined;
    }

    const text = resolveScreenText(value);
    if (!text) return undefined;

    const match = text.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    if (!match) return undefined;

    const parsed = Number(match[0]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function formatScreenPrice(price?: number, currencySymbol = "₹"): string {
    if (price == null || price <= 0) return "Ask";
    return `${currencySymbol || ""}${price.toLocaleString("en-IN")}`;
}

export function normalizeScreenCategoryName(value: unknown, fallback = "Menu"): string {
    const text = truncateScreenText(value, 42);
    if (!text) return fallback;

    if (TECHNICAL_CATEGORY_PATTERN.test(text) || UUID_LIKE_PATTERN.test(text)) {
        return fallback;
    }

    return text;
}

export function normalizeScreenImageUrl(value: unknown): string | undefined {
    const text = resolveScreenText(value);
    if (!text) return undefined;

    if (
        text.startsWith("http://")
        || text.startsWith("https://")
        || text.startsWith("/")
        || text.startsWith("data:image/")
    ) {
        return text;
    }

    return undefined;
}

export function normalizeScreenTags(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;

    const seen = new Set<string>();
    const tags: string[] = [];

    for (const entry of value) {
        const tag = truncateScreenText(entry, 32);
        if (!tag) continue;

        const key = tag.toLowerCase();
        if (seen.has(key)) continue;

        seen.add(key);
        tags.push(tag);
        if (tags.length >= 8) break;
    }

    return tags.length ? tags : undefined;
}

export function getScreenDietType(tags?: string[]): "veg" | "nonVeg" | null {
    const normalizedTags = normalizeScreenTags(tags) || [];
    const joined = normalizedTags.map((tag) => tag.toLowerCase()).join(" ");

    if (/\bnon[\s-]?(veg|vegetarian)\b/.test(joined) || /\bnonvegetarian\b/.test(joined)) {
        return "nonVeg";
    }

    if (/\bpure veg\b/.test(joined) || /\bveg\b/.test(joined) || /\bvegetarian\b/.test(joined)) {
        return "veg";
    }

    return null;
}

export function normalizeOwnerSlideCaption(caption?: unknown): string {
    return truncateScreenText(caption, OWNER_CAPTION_MAX, "Custom slide");
}

export function getScreenCategoryCaption(categoryName?: string): string {
    const category = normalizeScreenCategoryName(categoryName, "");
    return category && category !== "Menu" ? category : "On menu";
}

export function dedupeScreenMenuItems(items: MenuItemForSlide[]): MenuItemForSlide[] {
    const ordered: MenuItemForSlide[] = [];
    const indexByKey = new Map<string, number>();

    for (const item of items) {
        const key = resolveScreenText(item.id)
            || `${resolveScreenText(item.categoryName).toLowerCase()}|${resolveScreenText(item.name).toLowerCase()}`;
        if (!key) continue;

        const existingIndex = indexByKey.get(key);
        if (existingIndex == null) {
            indexByKey.set(key, ordered.length);
            ordered.push(item);
            continue;
        }

        const existing = ordered[existingIndex];
        ordered[existingIndex] = {
            ...existing,
            imageUrl: existing.imageUrl || item.imageUrl,
            price: existing.price ?? item.price,
            description: existing.description || item.description,
            tags: existing.tags?.length ? existing.tags : item.tags,
            isBestSeller: existing.isBestSeller || item.isBestSeller,
        };
    }

    return ordered;
}

const withoutUndefined = <T extends Record<string, unknown>>(value: T): T => (
    Object.fromEntries(
        Object.entries(value).filter(([, entry]) => entry !== undefined),
    ) as T
);

export function extractScreenMenuItemsFromProject(
    projectData: any,
    options: { limit?: number } = {},
): MenuItemForSlide[] {
    const extractedItems: MenuItemForSlide[] = [];
    const itemLimit = Math.max(1, Math.min(options.limit || SCREEN_MENU_PROJECTION_ITEM_LIMIT, SCREEN_MENU_PROJECTION_ITEM_LIMIT));

    for (const file of (projectData?.files || [])) {
        const categories = Array.isArray(file?.extractedData?.data?.categories)
            ? file.extractedData.data.categories
            : [];
        const categoryMap = categories.reduce((acc: Record<string, { name: string; orderIndex: number }>, category: any, index: number) => {
            const categoryName = normalizeScreenCategoryName(category?.name, "");
            if (category?.id && categoryName) {
                acc[category.id] = {
                    name: categoryName,
                    orderIndex: Number.isFinite(Number(category?.orderIndex)) ? Number(category.orderIndex) : index,
                };
            }
            return acc;
        }, {});

        const items = Array.isArray(file?.extractedData?.data?.items)
            ? file.extractedData.data.items
            : [];

        for (const [index, item] of items.entries()) {
            const itemName = resolveScreenText(item?.name);
            if (!itemName) continue;

            const itemDesc = resolveScreenText(item?.description) || undefined;
            const parsedPrice = parseScreenPrice(item?.price);
            const categoryInfo = item?.category ? categoryMap[item.category] : undefined;

            extractedItems.push(withoutUndefined({
                id: item?.id || `item-${extractedItems.length}`,
                name: itemName,
                imageUrl: normalizeScreenImageUrl(item?.images?.[0]?.url),
                price: parsedPrice,
                available: item?.available !== false,
                isBestSeller: item?.isBestSeller || false,
                categoryName: categoryInfo?.name || normalizeScreenCategoryName(item?.category),
                categoryOrderIndex: categoryInfo?.orderIndex,
                orderIndex: Number.isFinite(Number(item?.orderIndex)) ? Number(item.orderIndex) : index,
                description: itemDesc,
                tags: normalizeScreenTags(item?.tags),
            }));
        }
    }

    return dedupeScreenMenuItems(extractedItems).slice(0, itemLimit);
}
