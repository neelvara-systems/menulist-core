import { MenuItemForCampaign } from "@lib/campaigns/engine";
import {
    STAFF_PROMPT_CONFIDENCE_THRESHOLD,
    STAFF_PROMPT_INERTIA,
    TodayCampaignSummary,
} from "@type/campaigns";

interface EligibilityInput {
    primary: TodayCampaignSummary | undefined;
    item: MenuItemForCampaign | undefined;
    stableDays: number;
    validatedOnSurfaces: (
        | "decision_blocks"
        | "digital_screen"
        | "physical_surface"
    )[];
    stockOutsLast7Days: number;
    modifierCount: number;
    isAlcoholic: boolean;
}

interface EligibilityResult {
    eligible: boolean;
    reason?: string;
}

/**
 * Check if an item qualifies for Staff Prompt
 * Per spec: Highest confidence gate of all surfaces
 */
export function checkStaffPromptEligibility(
    input: EligibilityInput
): EligibilityResult {
    const {
        primary,
        item,
        stableDays,
        validatedOnSurfaces,
        stockOutsLast7Days,
        modifierCount,
        isAlcoholic,
    } = input;

    // Gate 1: Must have a primary campaign
    if (!primary) {
        return { eligible: false, reason: "no_primary_campaign" };
    }

    // Gate 2: Confidence threshold (0.8)
    if (primary.confidence < STAFF_PROMPT_CONFIDENCE_THRESHOLD) {
        return { eligible: false, reason: "confidence_below_threshold" };
    }

    // Gate 3: Stability (10+ days)
    if (stableDays < STAFF_PROMPT_INERTIA.STABILITY_DAYS_REQUIRED) {
        return { eligible: false, reason: "insufficient_stability" };
    }

    // Gate 4: Prior validation on other surfaces
    if (validatedOnSurfaces.length === 0) {
        return { eligible: false, reason: "not_validated_on_surfaces" };
    }

    // Gate 5: Item must be available
    if (!item?.available) {
        return { eligible: false, reason: "item_unavailable" };
    }

    // Gate 6: No stock volatility (0 stock-outs in 7 days)
    if (stockOutsLast7Days > 0) {
        return { eligible: false, reason: "stock_volatility" };
    }

    // Gate 7: No alcohol
    if (isAlcoholic) {
        return { eligible: false, reason: "alcoholic_item" };
    }

    // Gate 8: Modifier complexity (max 3)
    if (modifierCount > 3) {
        return { eligible: false, reason: "too_many_modifiers" };
    }

    return { eligible: true };
}

/**
 * Generate the staff prompt text
 * Per spec: ONE immutable sentence structure
 */
export function generateStaffPromptText(itemName: string): string {
    return `Most people take the ${itemName}.`;
}
