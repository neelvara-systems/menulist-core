/**
 * Evergreen Slide Generator
 * Per spec: Evergreen = trust anchor, not fallback junk
 * They represent "safe truth" that maintains owner trust even during uncertainty
 */

import { MenuItemForSlide, ScreenSlide, ScreenStoreInfo } from "@type/campaigns";
import { getScreenCategoryCaption } from "./screenContent";

/**
 * Generate evergreen slides from available menu items
 * Per spec: Evergreen slides may dominate when campaign confidence is low
 * 
 * Selection criteria:
 * 1. Must have image
 * 2. Must be available
 * 3. Prefer bestsellers, priced items, and source menu order
 * 4. Prefer category variety before repeating categories
 * 5. Max 3 evergreen items to leave room for variety
 */
export function generateEvergreenSlides(
    items: MenuItemForSlide[],
    menuQrUrl: string
): ScreenSlide[] {
    const slides: ScreenSlide[] = [];

    // Filter to only available items with images
    const eligibleItems = items.filter(item => item.available && item.imageUrl);

    if (eligibleItems.length === 0) {
        return slides;
    }

    // Sort: bestsellers first, then priced items, then source menu order.
    const sortedItems = [...eligibleItems].sort((a, b) => {
        if (a.isBestSeller && !b.isBestSeller) return -1;
        if (!a.isBestSeller && b.isBestSeller) return 1;
        if (a.price != null && b.price == null) return -1;
        if (a.price == null && b.price != null) return 1;
        const categoryOrder = (a.categoryOrderIndex ?? Number.MAX_SAFE_INTEGER) - (b.categoryOrderIndex ?? Number.MAX_SAFE_INTEGER);
        if (categoryOrder !== 0) return categoryOrder;
        const itemOrder = (a.orderIndex ?? Number.MAX_SAFE_INTEGER) - (b.orderIndex ?? Number.MAX_SAFE_INTEGER);
        if (itemOrder !== 0) return itemOrder;
        return a.name.localeCompare(b.name);
    });

    const selectedItems: MenuItemForSlide[] = [];
    const usedCategories = new Set<string>();

    for (const item of sortedItems) {
        const categoryKey = (item.categoryName || "Menu").toLowerCase();
        if (usedCategories.has(categoryKey) && selectedItems.length < Math.min(3, sortedItems.length)) {
            continue;
        }
        selectedItems.push(item);
        usedCategories.add(categoryKey);
        if (selectedItems.length >= 3) break;
    }

    for (const item of sortedItems) {
        if (selectedItems.length >= 3) break;
        if (!selectedItems.some((selected) => selected.id === item.id)) {
            selectedItems.push(item);
        }
    }

    for (const item of selectedItems) {
        slides.push({
            id: `evergreen-${item.id}`,
            source: "evergreen",
            type: "item_highlight",
            imageUrl: item.imageUrl!,
            itemId: item.id,
            itemName: item.name,
            price: item.price, // v2.0: Propagate price to slide
            description: item.description, // v2.2: For poster-style slides
            tags: item.tags, // v2.2: Dietary badges
            caption: getEvergreenCaption(item),
            qrUrl: menuQrUrl,
            confidenceScore: 1.0, // Evergreen = maximum trust
            availabilityLinked: true,
            availabilityReliability: "high" // Evergreen items are stable
        });
    }

    return slides;
}

/**
 * Generate brand fallback slide
 * Per spec: Last resort, never empty - Logo + QR
 */
export function generateBrandFallback(storeInfo: ScreenStoreInfo): ScreenSlide {
    return {
        id: "brand-fallback",
        source: "evergreen",
        type: "brand_fallback",
        imageUrl: storeInfo.logoUrl || "/images/default-store-logo.png",
        caption: storeInfo.name,
        qrUrl: storeInfo.menuQrUrl,
        confidenceScore: 1.0, // Brand fallback = always trustworthy
        availabilityLinked: false,
        availabilityReliability: "high"
    };
}

/**
 * Get evergreen caption based on item properties
 * Per spec: Use approved language only (no marketing jargon)
 */
export function getEvergreenCaption(item: MenuItemForSlide): string {
    if (item.isBestSeller) {
        return "Popular";
    }
    if (item.categoryName) {
        return getScreenCategoryCaption(item.categoryName);
    }
    return "On menu";
}
