/**
 * Command Center Types
 *
 * Types for the Menu Command Center — bulk operations modal.
 * @see __docs__/menu-command-center/menu-command-center_impl.md
 */

// ─────────────────────────────────────────
// COMMAND CENTER ACTION TYPES
// ─────────────────────────────────────────

export type CommandCenterAction = 'repairMenu' | 'pricing' | 'availability' | 'moveCategory' | 'textCase' | 'activeInactive';

export interface RepairMenuSummary {
    descriptionsToGenerate: number;
    fixableNowCount: number;
    languageIssueCount: number;
    languagesToRepair: number;
    manualReviewCount: number;
    missingImages: number;
    missingPrices: number;
    projectContentIssueCount: number;
    projectContentLanguagesToRepair: number;
}

// ─────────────────────────────────────────
// SELECTION STATE
// ─────────────────────────────────────────

export interface SelectedItemInfo {
    id: string;
    name: string;
    price: string;
    category: string;
    categoryName: string;
    fileUid: string;
    active: boolean;
    available: boolean;
    isLocked: boolean;
    attributes?: Array<{
        id: string;
        name: string;
        price: string;
    }>;
}

export interface SelectionSummary {
    totalSelected: number;
    editableCount: number;
    lockedCount: number;
    activeCount: number;
    inactiveCount: number;
    categories: string[];
    outletName: string;
    isMasterMenu: boolean;
}

// ─────────────────────────────────────────
// PRICING ACTION
// ─────────────────────────────────────────

export type PricingMethod =
    | 'increasePercent'
    | 'decreasePercent'
    | 'addFlat'
    | 'reduceFlat'
    | 'setFixed';

export interface PricingConfig {
    method: PricingMethod;
    value: number;
}

// ─────────────────────────────────────────
// SAFETY GUARDRAILS
// ─────────────────────────────────────────

export const PRICING_GUARDRAILS = {
    MAX_INCREASE_PERCENT: 200,
    MAX_DECREASE_PERCENT: 80,
    MIN_PRICE: 1,
    ROUNDING: 'nearest_whole' as const,
} as const;

export const PRICING_WARNINGS = {
    LARGE_INCREASE_THRESHOLD: 40,
    LARGE_DECREASE_THRESHOLD: 40,
} as const;

// ─────────────────────────────────────────
// IMPACT PREVIEW
// ─────────────────────────────────────────

export interface PriceChangePreview {
    itemId: string;
    itemName: string;
    categoryName: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
    isAttribute?: boolean;
    attributeName?: string;
}

export interface ImpactSummary {
    itemsAffected: number;
    itemsSkipped: number;
    avgPriceBefore: number;
    avgPriceAfter: number;
    netChangePercent: number;
    allChanges: PriceChangePreview[]; // Changed from sampleChanges to allChanges
    warnings: string[];
}

// ─────────────────────────────────────────
// AVAILABILITY ACTION
// ─────────────────────────────────────────

export type AvailabilityTarget = 'available' | 'unavailable';

export interface AvailabilityPreview {
    itemsToChange: number;
    itemsAlreadyInState: number;
}

// ─────────────────────────────────────────
// MOVE CATEGORY ACTION
// ─────────────────────────────────────────

export interface MoveCategoryPreview {
    itemsToMove: number;
    sourceCategories: string[];
    destinationCategory: string;
}

// ─────────────────────────────────────────
// ACTIVE/INACTIVE ACTION (permanent show/hide)
// ─────────────────────────────────────────

export type ActiveInactiveTarget = 'show' | 'hide';

export interface ActiveInactivePreview {
    itemsToChange: number;
    itemsAlreadyInState: number;
}
