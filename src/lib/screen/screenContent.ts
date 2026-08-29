import type { MenuItemForSlide, ScreenSlide } from "@type/campaigns";
import { formatMenuPrice, parseSingleMenuPrice } from "@lib/pricing/formatMenuPrice";
import { getActivePublicItemPriceAttributes } from "@lib/pricing/publicItemPricePresentation";
import { normalizeOptionalMenuPrice } from "@lib/validation/pricing.schema";
import {
    FIRESTORE_TIMESTAMP_MAX_MILLISECONDS,
    screenTimestampToMillis,
} from "./screenTimestamp";

const SCREEN_TEXT_MAX_DEFAULT = 120;
const OWNER_CAPTION_MAX = 48;
export const SCREEN_MENU_PROJECTION_ITEM_LIMIT = 200;
export const SCREEN_MENU_RENDER_ITEM_LIMIT = 500;

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
const SCREEN_PROJECT_FILE_LIMIT = 100;
const SCREEN_PROJECT_CATEGORY_LIMIT = 500;
const SCREEN_PROJECT_ITEM_INSPECTION_LIMIT = 2_000;

export type PublicScreenSlide = Omit<ScreenSlide, "validUntil"> & {
    validUntil?: number;
};

export function serializeScreenSlidesForClient(
    slides: readonly ScreenSlide[],
): PublicScreenSlide[] {
    return slides.flatMap((slide) => {
        const { validUntil, ...serializableSlide } = slide;
        if (validUntil === undefined) return [serializableSlide];
        const validUntilMs = screenTimestampToMillis(validUntil);
        return validUntilMs === null || validUntilMs > FIRESTORE_TIMESTAMP_MAX_MILLISECONDS
            ? []
            : [{ ...serializableSlide, validUntil: validUntilMs }];
    });
}

const readScreenOwnValue = (value: unknown, key: PropertyKey): unknown => {
    if (!value || typeof value !== "object") return undefined;
    try {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && "value" in descriptor ? descriptor.value : undefined;
    } catch {
        return undefined;
    }
};

const snapshotScreenArray = (value: unknown, limit: number): unknown[] => {
    try {
        if (!Array.isArray(value)) return [];
        const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
        const length = lengthDescriptor && "value" in lengthDescriptor
            && Number.isSafeInteger(lengthDescriptor.value)
            && lengthDescriptor.value >= 0
            ? Math.min(lengthDescriptor.value, limit)
            : 0;
        const snapshot: unknown[] = [];
        for (let index = 0; index < length; index += 1) {
            const descriptor = Object.getOwnPropertyDescriptor(value, index);
            if (descriptor && "value" in descriptor) snapshot.push(descriptor.value);
        }
        return snapshot;
    } catch {
        return [];
    }
};

const normalizeScreenOrderIndex = (value: unknown, fallback: number): number => {
    if (typeof value === "number") {
        return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
    }
    if (typeof value !== "string" || !/^(?:0|[1-9]\d*)$/.test(value)) {
        return fallback;
    }
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) && String(numeric) === value ? numeric : fallback;
};

export function resolveScreenText(value: unknown, fallback = ""): string {
    let raw = "";

    if (typeof value === "string" || typeof value === "number") {
        raw = String(value);
    } else if (value && typeof value === "object") {
        for (const key of LOCALIZED_TEXT_KEYS) {
            const candidate = readScreenOwnValue(value, key);
            if (typeof candidate === "string" && candidate.trim()) {
                raw = candidate;
                break;
            }
        }

        if (!raw) {
            try {
                const descriptors = Object.getOwnPropertyDescriptors(value);
                const candidate = Object.values(descriptors).find(
                    (descriptor) => "value" in descriptor
                        && typeof descriptor.value === "string"
                        && descriptor.value.trim().length > 0,
                );
                raw = candidate && "value" in candidate && typeof candidate.value === "string"
                    ? candidate.value
                    : "";
            } catch {
                raw = "";
            }
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

export function parseScreenPrice(value: unknown): number | string | undefined {
    if (typeof value === "number") {
        return Number.isFinite(value) && value > 0 ? value : undefined;
    }

    const priceResult = normalizeOptionalMenuPrice(truncateScreenText(value, 40));
    if (!priceResult.success || !priceResult.data) return undefined;
    const text = priceResult.data;

    const parsed = parseSingleMenuPrice(text);
    if (parsed !== null) return parsed > 0 ? parsed : undefined;
    return text;
}

const SCREEN_CURRENCY_REGION: Record<string, string> = {
    AED: "AE",
    AUD: "AU",
    CAD: "CA",
    EUR: "IE",
    GBP: "GB",
    INR: "IN",
    NZD: "NZ",
    SGD: "SG",
    USD: "US",
};

export function resolveScreenNumberLocale(currencyCode = "INR", language?: unknown): string {
    const normalizedCurrency = String(currencyCode || "INR").trim().toUpperCase();
    const normalizedLanguage = typeof language === "string"
        ? language.trim().toLowerCase().split("-")[0]
        : "";
    const safeLanguage = /^[a-z]{2,3}$/.test(normalizedLanguage) ? normalizedLanguage : "en";
    return `${safeLanguage}-${SCREEN_CURRENCY_REGION[normalizedCurrency] || "US"}`;
}

export function formatScreenPrice(
    price?: number | string,
    currencySymbol = "₹",
    locale = "en-IN",
): string {
    const normalized = parseScreenPrice(price);
    if (normalized === undefined) return "Ask";
    if (typeof normalized === "number") {
        return `${currencySymbol || ""}${normalized.toLocaleString(locale)}`;
    }
    return formatMenuPrice(normalized, currencySymbol);
}

export function hasScreenPrice(price: unknown): boolean {
    return parseScreenPrice(price) !== undefined;
}

export function getScreenItemPrice(item: unknown): number | string | undefined {
    const priceAttributes = getActivePublicItemPriceAttributes(item);
    if (priceAttributes.length === 0) {
        return parseScreenPrice(readScreenOwnValue(item, "price"));
    }

    const numericPrices = priceAttributes.map((attribute) => (
        parseSingleMenuPrice(readScreenOwnValue(attribute, "price") as string | number)
    ));
    if (numericPrices.every((price): price is number => price !== null && price > 0)) {
        const min = Math.min(...numericPrices);
        const max = Math.max(...numericPrices);
        return min === max ? min : `${min}-${max}`;
    }

    const labels = Array.from(new Set(priceAttributes
        .map((attribute) => truncateScreenText(readScreenOwnValue(attribute, "price"), 40))
        .filter(Boolean)));
    return labels.slice(0, 2).join(" / ") || undefined;
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
    const seen = new Set<string>();
    const tags: string[] = [];

    for (const entry of snapshotScreenArray(value, 64)) {
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

/**
 * Project browser-owned offline menu data back into the public screen contract.
 * localStorage is mutable input, so compile-time MenuItemForSlide types are not
 * sufficient at this boundary.
 */
export function normalizeCachedScreenMenuItems(value: unknown): MenuItemForSlide[] {
    const normalized: MenuItemForSlide[] = [];
    const entries = snapshotScreenArray(value, SCREEN_MENU_RENDER_ITEM_LIMIT);

    for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        const id = truncateScreenText(readScreenOwnValue(entry, "id"), 160);
        const name = truncateScreenText(readScreenOwnValue(entry, "name"), 120);
        const available = readScreenOwnValue(entry, "available");
        if (!id || !name || typeof available !== "boolean") continue;

        const categoryOrderValue = readScreenOwnValue(entry, "categoryOrderIndex");
        const itemOrderValue = readScreenOwnValue(entry, "orderIndex");
        normalized.push(withoutUndefined({
            id,
            name,
            imageUrl: normalizeScreenImageUrl(readScreenOwnValue(entry, "imageUrl")),
            price: parseScreenPrice(readScreenOwnValue(entry, "price")),
            available,
            isBestSeller: readScreenOwnValue(entry, "isBestSeller") === true,
            categoryName: normalizeScreenCategoryName(
                readScreenOwnValue(entry, "categoryName"),
            ),
            categoryOrderIndex: categoryOrderValue === undefined
                ? undefined
                : normalizeScreenOrderIndex(categoryOrderValue, index),
            orderIndex: itemOrderValue === undefined
                ? undefined
                : normalizeScreenOrderIndex(itemOrderValue, index),
            description: truncateScreenText(
                readScreenOwnValue(entry, "description"),
                SCREEN_TEXT_MAX_DEFAULT,
            ) || undefined,
            tags: normalizeScreenTags(readScreenOwnValue(entry, "tags")),
        }));
    }

    return dedupeScreenMenuItems(normalized);
}

/**
 * Validate and normalize browser-owned cached slides. Expired or malformed
 * entries are omitted so offline mode cannot revive withdrawn poster truth.
 */
export function normalizeCachedScreenSlides(
    value: unknown,
    nowMilliseconds = Date.now(),
): PublicScreenSlide[] {
    const normalized: PublicScreenSlide[] = [];

    for (const entry of snapshotScreenArray(value, 8)) {
        const id = truncateScreenText(readScreenOwnValue(entry, "id"), 160);
        const source = readScreenOwnValue(entry, "source");
        const type = readScreenOwnValue(entry, "type");
        const confidenceScore = readScreenOwnValue(entry, "confidenceScore");
        const availabilityLinked = readScreenOwnValue(entry, "availabilityLinked");
        const availabilityReliability = readScreenOwnValue(
            entry,
            "availabilityReliability",
        );
        if (
            !id
            || (source !== "campaign" && source !== "evergreen" && source !== "pinned")
            || (
                type !== "item_highlight"
                && type !== "brand_fallback"
                && type !== "owner_upload"
            )
            || typeof confidenceScore !== "number"
            || !Number.isFinite(confidenceScore)
            || confidenceScore < 0
            || confidenceScore > 1
            || typeof availabilityLinked !== "boolean"
            || (
                availabilityReliability !== "high"
                && availabilityReliability !== "medium"
                && availabilityReliability !== "low"
            )
            || (type === "owner_upload" && source !== "pinned")
            || (type === "brand_fallback" && source !== "evergreen")
        ) {
            continue;
        }

        const imageUrl = normalizeScreenImageUrl(readScreenOwnValue(entry, "imageUrl"));
        if (type !== "brand_fallback" && !imageUrl) continue;

        const rawValidUntil = readScreenOwnValue(entry, "validUntil");
        const validUntilMilliseconds = rawValidUntil === undefined
            ? null
            : screenTimestampToMillis(rawValidUntil);
        if (
            rawValidUntil !== undefined
            && (
                validUntilMilliseconds === null
                || validUntilMilliseconds > FIRESTORE_TIMESTAMP_MAX_MILLISECONDS
                || validUntilMilliseconds <= nowMilliseconds
            )
        ) {
            continue;
        }

        const slide: PublicScreenSlide = {
            id,
            source,
            type,
            imageUrl: imageUrl || "",
            confidenceScore,
            availabilityLinked,
            availabilityReliability,
        };
        const itemId = truncateScreenText(
            readScreenOwnValue(entry, "itemId"),
            160,
        );
        const itemName = truncateScreenText(
            readScreenOwnValue(entry, "itemName"),
            120,
        );
        const price = parseScreenPrice(readScreenOwnValue(entry, "price"));
        const description = truncateScreenText(
            readScreenOwnValue(entry, "description"),
            SCREEN_TEXT_MAX_DEFAULT,
        );
        const tags = normalizeScreenTags(readScreenOwnValue(entry, "tags"));
        const caption = truncateScreenText(
            readScreenOwnValue(entry, "caption"),
            80,
        );
        const qrUrl = normalizeScreenImageUrl(readScreenOwnValue(entry, "qrUrl"));
        if (itemId) slide.itemId = itemId;
        if (itemName) slide.itemName = itemName;
        if (price !== undefined) slide.price = price;
        if (description) slide.description = description;
        if (tags) slide.tags = tags;
        if (caption) slide.caption = caption;
        if (qrUrl) slide.qrUrl = qrUrl;
        if (validUntilMilliseconds !== null) {
            slide.validUntil = validUntilMilliseconds;
        }
        normalized.push(slide);
    }

    return normalized;
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
    projectData: unknown,
    options: { limit?: number } = {},
): MenuItemForSlide[] {
    const extractedItems: MenuItemForSlide[] = [];
    const itemLimit = normalizeScreenOrderIndex(options.limit, SCREEN_MENU_RENDER_ITEM_LIMIT);
    const boundedItemLimit = Math.max(1, Math.min(itemLimit, SCREEN_MENU_RENDER_ITEM_LIMIT));
    let inspectedItems = 0;

    for (const file of snapshotScreenArray(
        readScreenOwnValue(projectData, "files"),
        SCREEN_PROJECT_FILE_LIMIT,
    )) {
        const extractedData = readScreenOwnValue(file, "extractedData");
        const data = readScreenOwnValue(extractedData, "data");
        const categories = snapshotScreenArray(
            readScreenOwnValue(data, "categories"),
            SCREEN_PROJECT_CATEGORY_LIMIT,
        );
        const categoryMap = new Map<string, { name: string; orderIndex: number }>();
        categories.forEach((category, index) => {
            const categoryName = normalizeScreenCategoryName(
                readScreenOwnValue(category, "name"),
                "",
            );
            const categoryId = resolveScreenText(readScreenOwnValue(category, "id"));
            if (categoryId && categoryName) {
                categoryMap.set(categoryId, {
                    name: categoryName,
                    orderIndex: normalizeScreenOrderIndex(
                        readScreenOwnValue(category, "orderIndex"),
                        index,
                    ),
                });
            }
        });

        const items = snapshotScreenArray(
            readScreenOwnValue(data, "items"),
            Math.min(SCREEN_PROJECT_ITEM_INSPECTION_LIMIT - inspectedItems, SCREEN_PROJECT_ITEM_INSPECTION_LIMIT),
        );

        for (let index = 0; index < items.length; index += 1) {
            const item = items[index];
            inspectedItems += 1;
            const itemName = resolveScreenText(readScreenOwnValue(item, "name"));
            if (!itemName) continue;

            const itemDesc = resolveScreenText(readScreenOwnValue(item, "description")) || undefined;
            const parsedPrice = getScreenItemPrice(item);
            const categoryId = resolveScreenText(readScreenOwnValue(item, "category"));
            const categoryInfo = categoryId ? categoryMap.get(categoryId) : undefined;
            const images = snapshotScreenArray(readScreenOwnValue(item, "images"), 1);
            const rawAvailability = readScreenOwnValue(item, "available");

            extractedItems.push(withoutUndefined({
                id: resolveScreenText(readScreenOwnValue(item, "id"))
                    || `item-${extractedItems.length}`,
                name: itemName,
                imageUrl: normalizeScreenImageUrl(readScreenOwnValue(images[0], "url")),
                price: parsedPrice,
                available: rawAvailability === undefined || rawAvailability === true,
                isBestSeller: readScreenOwnValue(item, "isBestSeller") === true,
                categoryName: categoryInfo?.name || normalizeScreenCategoryName(categoryId),
                categoryOrderIndex: categoryInfo?.orderIndex,
                orderIndex: normalizeScreenOrderIndex(
                    readScreenOwnValue(item, "orderIndex"),
                    index,
                ),
                description: itemDesc,
                tags: normalizeScreenTags(readScreenOwnValue(item, "tags")),
            }));

            if (extractedItems.length >= boundedItemLimit) break;
        }
        if (extractedItems.length >= boundedItemLimit || inspectedItems >= SCREEN_PROJECT_ITEM_INSPECTION_LIMIT) break;
    }

    return dedupeScreenMenuItems(extractedItems).slice(0, boundedItemLimit);
}
