import { Timestamp } from "@firebase/firestore";

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN TYPES (Strategy Doc + ChatGPT Aligned)
// ═══════════════════════════════════════════════════════════════

/**
 * Campaign Types - 5 Active + 4 Passive
 * All ship at launch per 3-year architecture freeze
 */
export type ActiveCampaignType =
    | "meal_push"           // Time-based, top items in meal category
    | "bestseller_boost"    // Items customers tend to notice
    | "slow_item_rescue"    // Items customers rarely notice
    | "festival"            // Calendar-based (Diwali, Holi, etc.)
    | "new_item";           // Trigger: new item added

export type PassiveCampaignType =
    | "todays_special"      // Daily, low-frequency
    | "weekend_pick"        // Friday morning trigger
    | "now_available"       // Item availability change
    | "menu_highlight";     // Evergreen fallback (confidence = 0)

export type CampaignType = ActiveCampaignType | PassiveCampaignType;

export type CampaignKind = "active" | "passive";

// ═══════════════════════════════════════════════════════════════
// OUTPUT INTENT & EXECUTION SURFACES
// ═══════════════════════════════════════════════════════════════

/**
 * Output Intent - What we're trying to achieve
 * Surfaces are OUTPUT MODES, not features
 */
export type OutputIntent =
    | "broadcast_attention"       // Reach many people quickly
    | "in_store_reinforcement"    // Influence walk-in decisions
    | "direct_customer_notify";   // Personal customer communication

/**
 * Execution Surfaces - 5 at launch
 */
export type ExecutionSurface =
    | "whatsapp_status"
    | "whatsapp_message"
    | "print_poster"
    | "qr_tent"
    | "digital_screen";

/**
 * Intent to Surface mapping (extensible)
 */
export const INTENT_TO_SURFACES: Record<OutputIntent, ExecutionSurface[]> = {
    broadcast_attention: ["whatsapp_status"],
    in_store_reinforcement: ["print_poster", "qr_tent", "digital_screen"],
    direct_customer_notify: ["whatsapp_message"]
};

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN STATUS & CONFIDENCE
// ═══════════════════════════════════════════════════════════════

export type CampaignStatus =
    | "suggested"    // Ready for action
    | "completed"    // Action taken
    | "skipped"      // User skipped
    | "suppressed";  // Auto-hidden (skip count too high)

/**
 * Campaign Confidence Gate (Formalized)
 * Campaign appears only if: confidence.total >= threshold for type
 */
export interface CampaignConfidence {
    availabilityScore: number;   // 0-1: Is item available?
    behaviorScore: number;       // 0-1: Customer interaction signals
    timingScore: number;         // 0-1: Right time of day/week?
    total: number;               // availabilityScore * behaviorScore * timingScore
}

/**
 * Confidence thresholds per campaign type
 */
export const CONFIDENCE_THRESHOLDS: Record<CampaignKind | "menu_highlight", number> = {
    active: 0.6,           // Higher bar for strategic campaigns
    passive: 0.3,          // Lower bar for operational signals
    menu_highlight: 0.0    // Always available (fallback)
};

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN OUTCOME (Non-Comparative)
// ═══════════════════════════════════════════════════════════════

/**
 * Outcome Signal - Qualitative only
 * Rule: If sentence can be followed by "Compared to what?" — it doesn't belong
 */
export type OutcomeSignal = "positive" | "neutral" | "insufficient_data";

export interface CampaignOutcome {
    signal: OutcomeSignal;
    observation: string;   // Non-comparative! e.g., "Customers noticed this item."
    closure: string;       // Emotional closure e.g., "Good to note."
}

/**
 * Approved outcome messages (non-comparative)
 */
export const OUTCOME_MESSAGES: Record<OutcomeSignal, { observation: string; closure: string }> = {
    positive: {
        observation: "Customers noticed this item.",
        closure: "Good to note."
    },
    neutral: {
        observation: "This item was interacted with.",
        closure: "Nothing unusual here."
    },
    insufficient_data: {
        observation: "No unusual activity detected.",
        closure: "Better to wait and see."
    }
};

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN ASSETS
// ═══════════════════════════════════════════════════════════════

export interface CampaignAssets {
    imageUrl?: string;
    caption?: string;
    whatsappMessage?: string;
    posterPdfUrl?: string;
    generatedAt?: Timestamp;
    source: "existing_image" | "generated_image";
}

// ═══════════════════════════════════════════════════════════════
// MAIN CAMPAIGN INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface Campaign {
    // Identity
    id: string;
    projectId: string;
    tId: number;
    sId: number;

    // Type
    kind: CampaignKind;
    type: CampaignType;

    // Subject
    subject: {
        itemId?: string;
        itemName?: string;
        categoryId?: string;
        categoryName?: string;
    };

    // Intent & Surface
    intent: OutputIntent;
    primarySurface: ExecutionSurface;
    secondarySurfaces: ExecutionSurface[];

    // Status
    status: CampaignStatus;

    // Confidence (internal)
    confidence: CampaignConfidence;

    // Timing
    suggestedFor: string;        // "YYYY-MM-DD"
    createdAt: Timestamp;
    updatedAt: Timestamp;
    resolvedAt?: Timestamp;

    // Assets (embedded, not separate collection)
    assets?: CampaignAssets;

    // Outcome (active only, optional)
    outcome?: CampaignOutcome;

    // Sequencing (for multi-day campaigns)
    sequence?: {
        totalSteps: number;
        currentStep: number;
        parentCampaignId?: string;
    };

    // Suppression tracking
    skipCount: number;
    suppressedUntil?: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN SUMMARY (For Today Screen - 1 Read)
// ═══════════════════════════════════════════════════════════════

/**
 * Lightweight campaign data for Today screen
 * Stored in platformSummary/campaigns_{sId}
 */
export interface TodayCampaignSummary {
    campaignId: string;
    projectId: string;
    type: CampaignType;
    kind: CampaignKind;
    subject: {
        itemId?: string;
        itemName?: string;
        itemImageUrl?: string;  // For digital screen slides
    };
    intent: OutputIntent;
    primarySurface: ExecutionSurface;
    status: CampaignStatus;
    confidence: number;  // Just the total score
}

/**
 * Summary document structure
 * Path: platformSummary/campaigns_{sId}
 */
export interface CampaignsSummaryDocument {
    lastUpdated: Timestamp;

    // Today's campaigns (what Today screen needs)
    today: {
        date: string;               // "YYYY-MM-DD"
        primary?: TodayCampaignSummary;
        operational: TodayCampaignSummary[];
        isEmpty: boolean;
    };

    // Stats for suppression logic
    stats: {
        totalCompleted: number;
        totalSkipped: number;
        lastCampaignDate?: string;
        typeSkipCounts: Partial<Record<CampaignType, number>>;
    };

    // Digital Screen State (optional, enabled on first access)
    screen?: DigitalScreenState;

    // Staff Prompt State (optional, computed during daily sync)
    staffPrompt?: StaffPrompt;

    // Physical Surfaces State (optional, computed during daily sync)
    physicalSurfaces?: PhysicalSurfaceEligibility;
}

// ═══════════════════════════════════════════════════════════════
// STAFF PROMPT TYPES
// Per spec: Highest confidence surface, influences human speech
// ═══════════════════════════════════════════════════════════════

/**
 * Staff Prompt Confidence Threshold
 * Higher than all other surfaces (0.8 vs 0.7 for screens, 0.6 for campaigns)
 */
export const STAFF_PROMPT_CONFIDENCE_THRESHOLD = 0.8;

/**
 * Staff Prompt Inertia Rules
 */
export const STAFF_PROMPT_INERTIA = {
    MIN_CONSECUTIVE_DAYS: 3,      // Same sentence for at least 3 days
    MAX_DAYS_PER_WEEK: 2,         // Appear at most 2 days per week
    STABILITY_DAYS_REQUIRED: 10,  // Item must be stable for 10+ days
};

/**
 * Staff Prompt State - Stored in CampaignsSummaryDocument
 * Per spec: Read-only display in Today tab, no owner control
 */
export interface StaffPrompt {
    // Display state
    eligible: boolean;
    text: string;                 // "Most people take the {itemName}."

    // Item reference
    itemId: string;
    itemName: string;

    // Confidence data (internal, never exposed)
    confidence: number;
    stableDays: number;

    // Inertia tracking
    inertia: {
        startDate: string;        // "YYYY-MM-DD" when this prompt started
        consecutiveDays: number;  // Days shown in a row
        weekAppearances: number;  // Times shown this week (resets Monday)
        weekStartDate: string;    // "YYYY-MM-DD" of current week's Monday
    };

    // Validation flags (internal)
    validatedOnSurfaces: ('decision_blocks' | 'digital_screen' | 'physical_surface')[];
}

// ═══════════════════════════════════════════════════════════════
// PHYSICAL SURFACES TYPES
// Per spec: Printed = permanent, higher confidence gates
// ═══════════════════════════════════════════════════════════════

/**
 * Physical Surface Confidence Thresholds
 * Higher than campaigns (printed = public + persistent)
 */
export const TENT_CARD_CONFIDENCE_THRESHOLD = 0.7;
export const COUNTER_STICKER_CONFIDENCE_THRESHOLD = 0.8;
export const STICKER_STABILITY_DAYS = 7;

/**
 * Physical Surface Eligibility
 * Added to CampaignsSummaryDocument
 */
export interface PhysicalSurfaceEligibility {
    tentCard?: TentCardEligibility;
    counterSticker?: CounterStickerEligibility;
}

export interface TentCardEligibility {
    eligible: boolean;
    itemId?: string;
    itemName?: string;
    itemImageUrl?: string;
    templateId: TentCardTemplate;
    confidence: number;
    qrUrl: string;
    recheckAfter: Timestamp; // Not expiry — system rechecks eligibility after this date
}

export interface CounterStickerEligibility {
    eligible: boolean;
    itemId?: string;
    itemName?: string;
    templateId: CounterStickerTemplate;
    confidence: number;
    stableSinceDays: number;
    qrUrl: string;
    recheckAfter: Timestamp; // Not expiry — system rechecks eligibility after this date
}

export type TentCardTemplate = 1 | 2 | 3 | 4;  // Template 5 banned from print
export type CounterStickerTemplate = 1 | 2 | 3 | 4;

/**
 * Template Copy Definitions
 * Template 5 ("Customers often try this first") is BANNED from physical surfaces
 * Only authoritative templates (1-4) are eligible for print
 */
export const TENT_CARD_TEMPLATES: Record<TentCardTemplate, string> = {
    1: "Most customers order {{item_name}}",
    2: "Short on time? {{item_name}} is ready fastest",
    3: "If you're unsure, start with {{item_name}}",
    4: "{{item_a}} + {{item_b}} is the most chosen combo",
};

export const COUNTER_STICKER_TEMPLATES: Record<CounterStickerTemplate, string> = {
    1: "Most customers order this first",
    2: "Regular customers choose this",
    3: "Not sure what to order? Start here.",
    4: "This combo is chosen most often",
};

// ═══════════════════════════════════════════════════════════════
// DIGITAL SCREEN TYPES
// Per spec: Screen = trust surface, not marketing surface
// ═══════════════════════════════════════════════════════════════

/**
 * Screen Confidence Threshold (Higher than campaigns)
 * Screens are public-facing; embarrassment cost is higher
 * Per spec: FR-12 - Screen confidence threshold = 0.7
 */
export const SCREEN_CONFIDENCE_THRESHOLD = 0.7; // vs 0.6 for campaigns

/**
 * Availability Reliability (Internal heuristic, no UI)
 * Used to exclude volatile items from screens
 * high → safe for screens
 * medium → allowed only if evergreen present
 * low → excluded from screens, allowed for Today/social
 */
export type AvailabilityReliability = "high" | "medium" | "low";

/**
 * Menu item shape used by screen pipeline (slide generator, evergreen, menu board)
 * Single source of truth — imported by slideGenerator.ts, evergreenSlides.ts, MenuBoardDisplay.tsx
 */
export interface MenuItemForSlide {
    id: string;
    name: string;
    imageUrl?: string;
    price?: number | string;
    available: boolean;
    isBestSeller?: boolean;
    categoryName?: string;
    categoryOrderIndex?: number;
    orderIndex?: number;
    description?: string; // v2.2: Short description for richer screen display
    tags?: string[]; // v2.2: Dietary/category tags (e.g. "Vegetarian", "Non-Vegetarian")
}

/**
 * Store identity for screen display (QR, branding, logo)
 * Used by ScreenDisplay, MenuBoardDisplay, slideGenerator, evergreenSlides, screenRenderer
 */
export interface ScreenStoreInfo {
    name: string;
    logoUrl?: string;
    menuQrUrl: string;
    currencySymbol?: string;
    activePlanType?: string | null;
}

/**
 * Compact generated menu payload for Digital Screens.
 * Stored inside CampaignsSummaryDocument.screen to avoid reconstructing
 * screen menu items from full project documents on every cold public render.
 */
export interface ScreenMenuProjection {
    items: MenuItemForSlide[];
    baseProjectId: string;
    baseProjectSlug?: string;
    activeSpecialMenuId?: string | null;
    contentVersion: number;
    updatedAt: Timestamp;
}

/**
 * Screen Slide - Individual slide in rotation
 * Per spec: 4-Layer Stack (Owner → Campaign → Evergreen → Brand)
 */
export interface ScreenSlide {
    id: string;
    source: "campaign" | "evergreen" | "pinned";
    type: "item_highlight" | "brand_fallback" | "owner_upload";

    // Content
    imageUrl: string;
    itemId?: string;
    itemName?: string;
    price?: number | string; // Preserves numeric, range, and bounded text-price truth.
    description?: string; // v2.2: Item description for poster-style slides
    tags?: string[]; // v2.2: Dietary/category tags (e.g. "Vegetarian", "Spicy")
    caption?: string;
    qrUrl?: string;

    // Confidence (for monotonicity enforcement)
    // Per spec: FR-13 - Screen never downgrades content quality mid-day
    confidenceScore: number; // Must be >= 0.7 for screen eligibility

    // Validity
    availabilityLinked: boolean; // If true, auto-remove when item unavailable
    availabilityReliability: AvailabilityReliability; // Internal heuristic
    validUntil?: Timestamp; // Optional expiry
    // DEFAULT EXPIRATION RULE:
    // - Owner uploads: 14 days from upload (prevents stale festival posters)
    // - Campaign slides: tied to campaign validity
    // - Evergreen slides: no expiry (always valid)
}

/**
 * Digital Screen State - Stored in CampaignsSummaryDocument
 * Per spec: No separate collection, extends existing summary doc
 */
export interface DigitalScreenState {
    enabled: boolean;
    screenToken: string; // High-entropy token for URL (22 chars, ~130-bit; legacy stores may have 8-char)
    lastRefreshed: Timestamp;

    // INVALIDATION: Lightweight event-based refresh trigger
    // When availability or menu changes, bump this version
    // Client checks version; if changed, force refresh immediately
    contentVersion: number; // Incremented on availability/menu change
    lastContentChangeAt: Timestamp; // For debugging
    menuProjection?: ScreenMenuProjection; // Generated read model for cold SSR screen renders

    // Slides (computed, not stored permanently)
    // NOTE: These are regenerated on each summary sync
    // MONOTONICITY: Never show lower-confidence content than current
    currentMinConfidence: number; // Track highest confidence shown today

    // Owner overrides
    ownerOverrideEnabled: boolean;
    pinnedSlides: ScreenSlide[]; // Max 3

    // HARDENING: Daily seen signal for operational awareness
    // Updated once per day per screen via /api/screen/seen
    // NOT a heartbeat - just "I was alive today"
    screenLastSeenAt?: Timestamp;
}

/**
 * Screen API Response - What the TV receives
 */
export interface ScreenAPIResponse {
    slides: ScreenSlide[];
    refreshIntervalMs: number;  // 300000 = 5 minutes
    slideDurationMs: number;    // 8000 = 8 seconds
    contentVersion: number;     // For invalidation check
    storeInfo: {
        name: string;
        logoUrl?: string;
        menuQrUrl: string;
        currencySymbol?: string;
    };
}

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN EXPORT EVENT
// ═══════════════════════════════════════════════════════════════

export type ExportMethod = "whatsapp_share" | "download" | "copy_text";

export interface CampaignExport {
    id: string;
    campaignId: string;
    projectId: string;
    tId: number;
    sId: number;

    surface: ExecutionSurface;
    method: ExportMethod;

    // Attribution (internal use only - never shown to owner)
    menuLinkWithTracking?: string;

    exportedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// UI COPY TEMPLATES
// ═══════════════════════════════════════════════════════════════

/**
 * Action title templates - Affirmative, present tense
 * Never use: "recommended", "suggested", "AI"
 */
export const ACTION_TITLES: Record<CampaignType, string> = {
    // Active
    meal_push: "{mealName} Push is ready",
    bestseller_boost: "Bestseller is ready",
    slow_item_rescue: "Item highlight is ready",
    festival: "{festivalName} special is ready",
    new_item: "New item is ready",
    // Passive
    todays_special: "Today's Special is ready",
    weekend_pick: "Weekend Pick is ready",
    now_available: "Now Available: {itemName}",
    menu_highlight: "Highlight one item from your menu"
};

/**
 * Button copy per surface
 * Verb first, concrete outcome, no "post", "publish", "campaign"
 */
export const SURFACE_BUTTON_COPY: Record<ExecutionSurface, string> = {
    whatsapp_status: "Open WhatsApp to mark shared",
    whatsapp_message: "Open message to mark shared",
    print_poster: "Download poster to mark done",
    qr_tent: "Download tent card to mark done",
    digital_screen: "Download screen image to mark done"
};

/**
 * Secondary context templates - Quiet, operational, no numbers
 */
export const CONTEXT_TEMPLATES: Record<CampaignType, string> = {
    meal_push: "Good for {mealName}",
    bestseller_boost: "Popular with customers",
    slow_item_rescue: "Worth highlighting",
    festival: "Perfect for {festivalName}",
    new_item: "Recently added",
    todays_special: "Available today",
    weekend_pick: "Good for the weekend",
    now_available: "Back in stock",
    menu_highlight: "A simple way to show what you do"
};

// ═══════════════════════════════════════════════════════════════
// FORBIDDEN PHRASES (Copy Governance)
// ═══════════════════════════════════════════════════════════════

export const FORBIDDEN_PHRASES = [
    // Attribution/Claims
    "worked",
    "boosted",
    "increased",
    "decreased",
    "improved",

    // Tech/AI
    "analytics",
    "AI",
    "algorithm",
    "model",
    "data",

    // Suggestions
    "recommended",
    "suggested",
    "optimal",
    "best time",
    "best performing",

    // Comparative (violates non-comparative rule)
    "compared to",
    "more than usual",
    "better than",
    "increased from",

    // Marketing
    "campaign",  // Never in UI copy
    "marketing",
    "promotion",
    "boost"
];
