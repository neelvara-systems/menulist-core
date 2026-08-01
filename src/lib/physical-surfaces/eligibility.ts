import {
    COUNTER_STICKER_CONFIDENCE_THRESHOLD,
    CounterStickerTemplate,
    PhysicalSurfaceEligibility,
    STICKER_STABILITY_DAYS,
    TENT_CARD_CONFIDENCE_THRESHOLD,
    TentCardTemplate,
    TodayCampaignSummary,
} from "@type/campaigns";
import { Timestamp } from "firebase/firestore";

function readOwnDataField(value: unknown, key: string): unknown {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    try {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && "value" in descriptor ? descriptor.value : undefined;
    } catch {
        return undefined;
    }
}

function boundedText(value: unknown, maxLength: number): string {
    if (typeof value !== "string") return "";
    const normalized = value.trim();
    return normalized && normalized.length <= maxLength ? normalized : "";
}

/**
 * Calculate physical surface eligibility
 * Called during campaign summary sync
 * 
 * Per spec:
 * - Tent Card: confidence ≥ 0.7
 * - Counter Sticker: confidence ≥ 0.8 + 7 days stability
 * - Template 5 is BANNED from physical surfaces
 */
export function calculatePhysicalSurfaceEligibility(
    primary: TodayCampaignSummary | undefined,
    menuQrUrl: string,
    itemStabilityDays?: number
): PhysicalSurfaceEligibility {
    const result: PhysicalSurfaceEligibility = {};

    const subject = readOwnDataField(primary, "subject");
    const itemName = boundedText(readOwnDataField(subject, "itemName"), 200);
    const itemId = boundedText(readOwnDataField(subject, "itemId"), 160);
    const confidence = readOwnDataField(primary, "confidence");
    const campaignType = boundedText(readOwnDataField(primary, "type"), 64);
    const qrUrl = boundedText(menuQrUrl, 4_096);
    if (
        !itemName
        || !itemId
        || !qrUrl
        || typeof confidence !== "number"
        || !Number.isFinite(confidence)
        || confidence < 0
        || confidence > 1
    ) {
        return result;
    }
    const itemImageUrl = boundedText(readOwnDataField(subject, "itemImageUrl"), 4_096) || undefined;

    // Tent Card: Lower threshold (0.7)
    if (confidence >= TENT_CARD_CONFIDENCE_THRESHOLD) {
        result.tentCard = {
            eligible: true,
            itemId,
            itemName,
            itemImageUrl,
            templateId: selectTentCardTemplate(campaignType),
            confidence,
            qrUrl,
            recheckAfter: getRecheckAfter(7), // System rechecks eligibility after 7 days
        };
    }

    // Counter Sticker: Higher threshold (0.8) + stability requirement
    const stableDays = typeof itemStabilityDays === "number"
        && Number.isSafeInteger(itemStabilityDays)
        && itemStabilityDays >= 0
        ? itemStabilityDays
        : 0;
    if (
        confidence >= COUNTER_STICKER_CONFIDENCE_THRESHOLD &&
        stableDays >= STICKER_STABILITY_DAYS
    ) {
        result.counterSticker = {
            eligible: true,
            itemId,
            itemName,
            templateId: selectStickerTemplate(campaignType),
            confidence,
            stableSinceDays: stableDays,
            qrUrl,
            recheckAfter: getRecheckAfter(30), // System rechecks eligibility after 30 days
        };
    }

    return result;
}

/**
 * Select tent card template based on campaign type
 * IMPORTANT: Template 5 is BANNED from physical surfaces
 * "Customers often try this first" = exploratory, not print-worthy
 * Only authoritative templates (1-4) are eligible for print
 */
function selectTentCardTemplate(campaignType: string): TentCardTemplate {
    switch (campaignType) {
        case "meal_push":
        case "bestseller_boost":
            return 1; // "Most customers order..." — default authority
        case "quick_pick":
            return 2; // "Short on time?" — speed-focused
        case "todays_special":
            return 3; // "If you're unsure..." — decision helper
        default:
            return 1; // Default to Template 1 (most authoritative)
    }
}

/**
 * Select counter sticker template based on campaign type
 */
function selectStickerTemplate(campaignType: string): CounterStickerTemplate {
    switch (campaignType) {
        case "bestseller_boost":
            return 2; // "Regular customers choose..."
        default:
            return 1; // "Most customers order this first"
    }
}

/**
 * Get recheck date (not expiry — system rechecks eligibility after this date)
 * Invalidation happens by EVENTS, not time:
 * - Item disabled / removed
 * - Item unavailable
 * - Confidence drops below threshold
 */
function getRecheckAfter(days: number): Timestamp {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return Timestamp.fromDate(date);
}
