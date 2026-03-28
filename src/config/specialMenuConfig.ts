/**
 * Special Menu Switching — Behavior Templates Configuration
 *
 * Maps business categories to behavior templates that control
 * which modes and scheduling options are available.
 *
 * Internal only — owner never sees template names or configuration.
 * System decides behavior based on getBusinessCategory() output.
 *
 * @see __docs__/special-menu-switching/special-menu-switching_impl.md
 */

import { getBusinessCategory } from "@data/shared/businessTypes";
import type {
    SpecialMenuBehaviorTemplate,
    SpecialMenuMode,
} from "@template/main-app/projects/types";

// ═══════════════════════════════════════════════════════════════
// BEHAVIOR TEMPLATE MAPPING
// ═══════════════════════════════════════════════════════════════

const CATEGORY_TEMPLATE_MAP: Record<string, SpecialMenuBehaviorTemplate> = {
    food: "dynamic",
    service: "occasional",
    retail: "minimal",
    health: "occasional",
    creative: "occasional",
    professional: "minimal",
    specialty: "occasional",
};

/**
 * Get behavior template for a business type.
 * Falls back to 'occasional' if business type is unknown.
 */
export function getBehaviorTemplate(
    businessType?: string,
): SpecialMenuBehaviorTemplate {
    const category = getBusinessCategory(businessType);
    return CATEGORY_TEMPLATE_MAP[category || ""] || "occasional";
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE CAPABILITIES
// ═══════════════════════════════════════════════════════════════

export interface TemplateCapabilities {
    /** Allow full menu replacement mode */
    allowReplace: boolean;
    /** Allow overlay (add section) mode */
    allowOverlay: boolean;
    /** Allow time-of-day scheduling (vs date-only) */
    allowTimeScheduling: boolean;
    /** Available modes for the creation UI */
    availableModes: SpecialMenuMode[];
}

export const TEMPLATE_CAPABILITIES: Record<
    SpecialMenuBehaviorTemplate,
    TemplateCapabilities
> = {
    dynamic: {
        allowReplace: true,
        allowOverlay: true,
        allowTimeScheduling: true,
        availableModes: ["replace", "overlay"],
    },
    occasional: {
        allowReplace: false,
        allowOverlay: true,
        allowTimeScheduling: false,
        availableModes: ["overlay"],
    },
    minimal: {
        allowReplace: false,
        allowOverlay: true,
        allowTimeScheduling: false,
        availableModes: ["overlay"],
    },
};

/**
 * Get capabilities for a business type.
 * Used by creation UI to determine available options.
 */
export function getSpecialMenuCapabilities(
    businessType?: string,
): TemplateCapabilities {
    const template = getBehaviorTemplate(businessType);
    return TEMPLATE_CAPABILITIES[template];
}
