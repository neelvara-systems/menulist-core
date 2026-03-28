/**
 * Slide Generator
 * Per impl.md: Generate slides from campaign data, menu items, and owner uploads
 * Per spec: 4-Layer Stack (Owner → Campaign → Evergreen → Brand)
 */

import {
    DigitalScreenState,
    MenuItemForSlide,
    SCREEN_CONFIDENCE_THRESHOLD,
    ScreenSlide,
    ScreenStoreInfo,
    TodayCampaignSummary
} from "@type/campaigns";
import { generateBrandFallback, generateEvergreenSlides } from "./evergreenSlides";
import { filterExpiredSlides } from "./utils";

// Re-export for backward compatibility (MenuBoardDisplay imports from here)
export type { MenuItemForSlide } from "@type/campaigns";

/**
 * Minimum slides rule (FR-11)
 * Per spec: Screen always displays minimum 3 slides
 */
const MINIMUM_SLIDES = 3;
const MAXIMUM_SLIDES = 8;

interface SlideGeneratorInput {
    screenState: DigitalScreenState;
    todayCampaign?: TodayCampaignSummary;
    menuItems: MenuItemForSlide[];
    storeInfo: ScreenStoreInfo;
}

/**
 * Generate slides for screen display
 * Per spec: Non-Negotiable Rule - Screen always shows minimum 3 slides
 * Order: Owner Pinned → Campaign → Evergreen → Brand Fallback
 */
export function generateScreenSlides(input: SlideGeneratorInput): ScreenSlide[] {
    const { screenState, todayCampaign, menuItems, storeInfo } = input;
    const slides: ScreenSlide[] = [];

    // Layer 1: Owner Pinned (highest priority)
    // Per spec: Always included when present (14-day default expiry)
    if (screenState.pinnedSlides.length > 0) {
        const validPinnedSlides = filterExpiredSlides(screenState.pinnedSlides);
        slides.push(...validPinnedSlides);
    }

    // Layer 2: Campaign Slides
    // Per spec: Time-scoped, availability-checked, confidence >= 0.7
    if (todayCampaign && todayCampaign.confidence >= SCREEN_CONFIDENCE_THRESHOLD) {
        const campaignSlide = createCampaignSlide(todayCampaign, menuItems);
        if (campaignSlide) {
            slides.push(campaignSlide);
        }
    }

    // Layer 3: Evergreen Slides
    // Per spec: Trust anchor — safe, always valid, reliability spine
    const availableItems = menuItems.filter(item => item.available && item.imageUrl);
    const evergreenSlides = generateEvergreenSlides(availableItems, storeInfo.menuQrUrl);
    slides.push(...evergreenSlides);

    // Layer 4: Brand Fallback
    // Per spec: Last resort, never empty
    const brandSlide = generateBrandFallback(storeInfo);
    slides.push(brandSlide);

    // Enforce minimum slides (FR-11)
    // If we still don't have enough, duplicate evergreen/brand
    while (slides.length < MINIMUM_SLIDES) {
        slides.push(brandSlide);
    }

    // Enforce maximum slides
    const finalSlides = slides.slice(0, MAXIMUM_SLIDES);

    // Apply monotonicity check (FR-13)
    // Per spec: Screen never downgrades content quality mid-day
    return applyMonotonicity(finalSlides, screenState.currentMinConfidence);
}

/**
 * Create slide from campaign
 */
function createCampaignSlide(
    campaign: TodayCampaignSummary,
    menuItems: MenuItemForSlide[]
): ScreenSlide | null {
    const item = menuItems.find(m => m.id === campaign.subject?.itemId);

    if (!item || !item.available || !item.imageUrl) {
        return null;
    }

    return {
        id: `campaign-${campaign.campaignId}`,
        source: "campaign",
        type: "item_highlight",
        imageUrl: item.imageUrl,
        itemId: item.id,
        itemName: item.name,
        price: item.price, // v2.0: Propagate price to slide
        description: item.description, // v2.2: For poster-style slides
        tags: item.tags, // v2.2: Dietary badges
        caption: getCampaignCaption(campaign.type),
        confidenceScore: campaign.confidence,
        availabilityLinked: true,
        availabilityReliability: "high"
    };
}

/**
 * Get caption based on campaign type
 * Per spec: Use approved language only
 */
function getCampaignCaption(campaignType: string): string {
    const captions: Record<string, string> = {
        meal_push: "Today's Pick",
        bestseller_boost: "Popular Choice",
        todays_special: "Today's Special",
        weekend_pick: "Weekend Pick",
        new_item: "New Arrival",
        menu_highlight: "Chef's Pick"
    };
    return captions[campaignType] || "Featured";
}

/**
 * Apply confidence monotonicity rule
 * Per spec: Never show lower-confidence content than what's already shown
 */
function applyMonotonicity(slides: ScreenSlide[], minConfidence: number): ScreenSlide[] {
    return slides.filter(slide => {
        // Evergreen and brand slides always pass (confidence = 1 for trust)
        if (slide.source === "evergreen" || slide.type === "brand_fallback") {
            return true;
        }
        // Owner uploads always pass (explicit override)
        if (slide.source === "pinned") {
            return true;
        }
        // Campaign slides must meet monotonicity
        return slide.confidenceScore >= minConfidence;
    });
}
