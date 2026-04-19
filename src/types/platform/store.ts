import { Timestamp } from "firebase/firestore";
import type { OutletPolicy } from "../multiOutlet.types";
import { StoreRoleDataType } from "./roles";

/**
 * Time Slot Preset - Store-level configuration for category time windows
 * Owners can create presets like "Breakfast", "Lunch", "Dinner" etc.
 * Categories reference these presets by ID
 */
export type TimeSlotPreset = {
    id: string; // Unique ID e.g., "ts_abc123"
    label: string; // Display name e.g., "Breakfast"
    startTime: string; // "HH:mm" format e.g., "07:00"
    endTime: string; // "HH:mm" format e.g., "10:00"
    color?: string; // Optional badge color for UI
};

export type StoreDataType = {
    storeId: number;
    storeKey: string;
    tenantId: number;
    tenantName: string;
    active: boolean;
    blocked?: boolean;
    deleted: boolean;
    verified?: boolean;

    name: string;
    email: string;
    countryCode?: string;
    dialCode?: string;
    phoneNumber: string;
    alternatePhoneNumber?: string;
    description?: string;
    gstn?: string;
    domain?: string;
    url?: string;
    createdBy?: string;
    createdOn?: string;
    logo: string;
    licenceKey?: string;
    licenceExpiryDate?: string;
    addressLine?: string;
    area?: string;
    district?: string;
    city: string;
    state: string;
    postalCode?: string;
    country?: string;
    timeZone?: string;
    dateFormat?: string;
    timeFormat?: string;
    language?: string;

    // ══════════════════════════════════════════════════════════
    // MULTI-CHAIN LANGUAGE GOVERNANCE (Feature #4 Extension)
    // See: __docs__/projects/multi-language-translation/multi-language-translation_spec.md
    // ══════════════════════════════════════════════════════════

    /**
     * Languages available for this store's projects
     * 
     * Master store: Defines all languages for the chain (can add any language up to MAX)
     * Outlet store: Subset of master's (what outlet enables)
     * 
     * Default: ['en'] if not set
     * 
     * @example ['en', 'hi', 'fr', 'ar', 'gu']
     */
    activeLanguages?: string[];

    /**
     * Default rendering language for QR/PDF/Screen
     * 
     * Rendering priority:
     * 1. URL ?lang=xx parameter
     * 2. store.defaultLanguage
     * 3. Fallback: 'en'
     * 
     * Default: 'en' if not set
     * 
     * @example 'gu' (for Gujarat outlet)
     */
    defaultLanguage?: string;

    currencyCode: string; //INR
    currencySymbol: string;

    businessType: string;
    businessCategory: string;
    businessIndustry?: string; // Plan type: 'B2C' | 'B2B'. Future scope for B2B features.

    contactPersonName: string;
    contactPersonEmail: string;
    contactPersonNumber: string;

    roles: StoreRoleDataType[];
    // NOTE: rolesPermissionStrategy removed - not needed with single role per store

    workingHours?: Record<string, string>;
    socialMedia?: Record<string, string>;

    // SEO Settings (from Business Settings)
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
    tagline?: string;

    // Multi-tenant Domain Settings
    subdomain?: string; // e.g., "joespizza" → joespizza.menulist.ai
    customDomain?: string; // e.g., "joespizza.com"
    domainVerified?: boolean; // DNS verification status
    primaryProjectId?: string; // Default project to show on domain

    // Time Slot Presets for category time-based visibility
    timeSlotPresets?: TimeSlotPreset[];

    // ── URL ROUTING (Feature: URL Routing Architecture) ────────────
    // @see __docs__/url-routing-architecture/README.md ADR-1

    /** URL path segment for outlet routing under brand subdomain.
     *  e.g., "pune" → brand.menulist.ai/pune
     *  Auto-generated from outlet name during creation.
     *  Only set on outlet stores (isMaster=false). Master store has subdomain instead. */
    outletSlug?: string;

    /** G-07 (§11 + §7 PUBLIC-ROUTING-DOCTRINE): outlet slug rename chain.
     *  Previous outletSlug values, preserved when an outlet is renamed so
     *  physical QRs / printed signage with the old URL still resolve via a
     *  301 redirect to the canonical outlet URL. Capped at 5 entries;
     *  oldest drops off, matching the project previousSlugs[] semantics. */
    previousOutletSlugs?: string[];

    // Multi-Store Consistency (Feature #4)
    // First store in a chain is the master store — all its projects are master projects
    isMaster?: boolean; // Default: false. True = this store's projects are master menus

    // Multi-Outlet — Chain-wide outlet policy (Feature #4C)
    // Stored on MASTER store doc ONLY. One policy for ALL outlets.
    outletPolicy?: OutletPolicy;

    // Multi-Outlet Billing — Outlet Removal (Feature #4C-B §10)
    scheduledForBillingRemoval?: boolean;  // Marked for quantity reduction next billing cycle
    billingRemovalScheduledAt?: Timestamp; // When removal was scheduled

    analytics?: {
        googleAnalyticsId?: string;
        googleSearchConsole?: string;
        facebookPixelId?: string;
        enhancedEcommerce?: boolean;
        trackMenuViews?: boolean;
        trackLocation?: boolean;
        dashboardPreferences?: {
            dateRange: string;
            favoriteMetrics: string[];
            chartType: string;
        };
    };

    // Chat Analytics Metadata (for self-healing dashboard)
    // Store-level tracking since one tenant can have multiple stores
    chatAnalytics?: {
        lastSuccessfulRun?: Timestamp;
        lastAttemptedRun?: Timestamp;
        lastStatus?: "SUCCESS" | "FAILED" | "IN_PROGRESS";
        lastError?: string;
        lastProcessedDate?: string; // YYYY-MM-DD format
    };

    // Google Business Profile Integration (Feature #3)
    // @see __docs__/gbp-sync/GBP_SYNC_impl.md
    gbp?: {
        isConnected: boolean;
        accountId?: string; // GBP account resource id
        locationId?: string; // GBP location resource id
        locationName?: string; // Cached display name
        locationAddress?: string; // Cached short address
        connectedOn?: Timestamp;
        connectedBy?: string;
        modifiedOn?: Timestamp;
        modifiedBy?: string;
        menuLinkMode: "MANAGED" | "OFF"; // Default: MANAGED
    };

    // GBP sync state (internal, not shown to user)
    gbpState?: {
        lastCheckedOn?: Timestamp;
        expectedUrl?: string;
        currentUrl?: string | null;
        linkStatus: "OK" | "MISSING" | "WRONG" | "UNKNOWN" | "NOT_WRITABLE";
        hoursStatus: "OK" | "MISMATCH" | "UNKNOWN" | "NOT_WRITABLE";
        lastHoursSnapshotHash?: string; // Detect changes without storing full data
        lastFixAttemptOn?: Timestamp;
        lastFixResult?: "SUCCESS" | "FAILED" | "SKIPPED";
        failureReason?: string;
    };

    // ─────────────────────────────────────────────────────────────
    // GUEST FEEDBACK SETTINGS (Feature: Internal Feedback System)
    // ─────────────────────────────────────────────────────────────

    /**
     * Master toggle for guest feedback at store level (default: true)
     *
     * When false: Feedback is disabled for ALL menus in this store,
     * regardless of per-project `menuSettings.feedback` value.
     *
     * Hierarchy: Store.feedbackEnabled → Project.menuSettings.feedback
     * Both must be true (or undefined) for feedback to show.
     *
     * Usage: if (store.feedbackEnabled !== false) → feedback is ON at store level
     */
    feedbackEnabled?: boolean;

    /**
     * Default contact field settings for guest feedback in this store
     *
     * Why store-level (not per-project):
     * - Reduces decision overload (1 decision per store, not per menu)
     * - Handles regional compliance (GDPR stores vs India stores)
     * - Multi-chain HQ can set different defaults per region
     *
     * Applied to ALL menus in this store that have feedback enabled.
     */
    feedbackDefaults?: {
        /** Show comment field on feedback form (default: true) */
        collectComment?: boolean;
        /** Require comment when shown (default: false) */
        collectCommentRequired?: boolean;

        /** Collect customer name (default: false) */
        collectName: boolean;
        /** Require customer name when shown (default: false) */
        collectNameRequired?: boolean;

        /** Collect customer phone (default: true - India market) */
        collectPhone: boolean;
        /** Require customer phone when shown (default: false) */
        collectPhoneRequired?: boolean;

        /** Collect customer email (default: true) */
        collectEmail: boolean;
        /** Require customer email when shown (default: false) */
        collectEmailRequired?: boolean;
    };

    /**
     * Google Review URL for this store
     * Format: https://g.page/r/[placeId]/review
     *
     * Sources:
     * 1. Manual entry by owner (P0)
     * 2. GBP sync when connected (future, requires GBP_ACTIVATED flag)
     */
    reviewUrl?: string;

    // ─────────────────────────────────────────────────────────────
    // POS WEBHOOK SYNC (Feature: POS Sync)
    // @see __docs__/pos-webhook-sync/pos-webhook-sync_impl.md §3.1
    // ─────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────
    // SEO/AEO DISCOVERY INFRASTRUCTURE
    // @see __docs__/discovery-infrastructure/
    // ──────────────────────────────────────────────────────────────

    /** Geographic coordinates for Schema.org GeoCoordinates and local SEO */
    geo?: {
        latitude: number;
        longitude: number;
    };

    /** Price range indicator for Schema.org priceRange (e.g. "$", "$$", "$$$", "$$$$") */
    priceRange?: '$' | '$$' | '$$$' | '$$$$';

    /** Cuisine types served (controlled vocabulary from taxonomy/data/cuisines.json).
     *  Used for schema.org servesCuisine and AI discovery queries.
     *  @example ['Japanese', 'Ramen'] or ['Italian', 'Pizza'] */
    cuisineTypes?: string[];

    // ─────────────────────────────────────────────────────────────
    // OFFICIAL BUSINESS PAGE (OBP)
    // @see __docs__/official-business-page/official-business-page_impl.md §2
    // ─────────────────────────────────────────────────────────────

    publicPresence?: {
        /** Short business descriptor, max 40 chars. e.g. "Modern Indian Kitchen" */
        descriptor?: string;

        /** Accent color hex for OBP buttons/highlights. Auto-detected from logo or manual. */
        accentColor?: string;

        /** WhatsApp number (may differ from phoneNumber). For wa.me link. Include country code. */
        whatsappNumber?: string;

        /** Google Maps URL for directions CTA */
        googleMapsUrl?: string;

        /** Toggle visibility of quick action buttons (all default true) */
        showCall?: boolean;
        showWhatsApp?: boolean;
        showDirections?: boolean;

        /** Reservation/booking URL (e.g., Dineout, Zomato, OpenTable, own website). For schema.org acceptsReservations + CTA. */
        reservationUrl?: string;

        /** Online ordering URL (e.g., Swiggy, Zomato, own website). For schema.org potentialAction OrderAction. */
        orderUrl?: string;

        /** Year the business was established. For schema.org foundingDate + OBP "Serving since" display. */
        establishedYear?: number;

        /** Short identity cue, max 40 chars. e.g. "Known for: wood-fired pizza". Helps category clarification on OBP. */
        knownFor?: string;

        // ── GOOGLE REVIEW REFERENCE (ADR-12: Reference, not hosting) ──
        // @see __docs__/official-business-page/obp-infrastructure-freeze-plan.md §Priority 1

        /** Google review page URL. Links to the business's Google reviews. */
        googleReviewUrl?: string;

        /** Google star rating (owner-entered, e.g. 4.5). Displayed as trust badge on OBP. */
        googleRating?: number;

        /** Google review count (owner-entered, e.g. 320). Displayed alongside rating. */
        googleReviewCount?: number;

        // ── BUSINESS PHOTOS (ADR-13: Max 3 curated, NOT a gallery) ──
        // @see __docs__/official-business-page/obp-infrastructure-freeze-plan.md §Priority 2

        /** Up to 3 curated business photos (storefront, interior, hero product). Max 3 URLs. */
        photos?: string[];

        // ── GOOGLE LISTING LINK STATUS (Pre-API bridge) ──
        // Tracks whether owner has manually set OBP URL as their Google website link.
        // Replaced by GBP auto-sync when ENABLE_GBP_SYNC becomes true.

        /** Whether owner confirmed they updated their Google listing website to OBP URL. */
        googleLinkUpdated?: boolean;

        /** ISO timestamp when owner confirmed Google link update. */
        googleLinkUpdatedAt?: string;
    };

    // ─────────────────────────────────────────────────────────────
    // PERMANENT CLOSURE STATE
    // When true, OBP shows "Permanently Closed" and disables menu CTA.
    // Schema.org emits closedPermanently signal.
    // This is a store-level state, not a temp status.
    // @see __docs__/official-business-page/obp-infrastructure-freeze-plan.md §3.2
    // ─────────────────────────────────────────────────────────────

    permanentlyClosed?: boolean;

    posSync?: {
        enabled: boolean;
        webhookUrl: string;
        webhookSecret: string;
        status: 'healthy' | 'retrying' | 'connection_issue' | 'disabled';
        lastSentAt: Timestamp | null;
        lastStatus: 'success' | 'failed' | 'never_sent';
        lastError: string;
        menuVersion: number;
        instructionsSentCount: number;
        instructionsSentDate: string;
    };

    // ─────────────────────────────────────────────────────────────
    // BUSINESS ATTRIBUTES (BTG Layer: Business Attributes)
    // Powers discovery queries ("restaurant with outdoor seating near me")
    // Feature flag: ENABLE_BUSINESS_ATTRIBUTES
    // @see __docs__/business-truth-graph/_archive/chatgpt-review-session13.md §Layer 12
    // ─────────────────────────────────────────────────────────────

    /**
     * Structured business attributes for discovery and schema.org.
     * All fields optional — owner fills what applies.
     * Read from already-loaded store doc (zero extra cost).
     */
    businessAttributes?: {
        /** Dietary options offered */
        vegetarian?: boolean;
        vegan?: boolean;
        halal?: boolean;
        glutenFree?: boolean;

        /** Amenities */
        wifi?: boolean;
        outdoorSeating?: boolean;
        parking?: boolean;
        airConditioning?: boolean;
        liveMusic?: boolean;
        petFriendly?: boolean;

        /** Service modes */
        dineIn?: boolean;
        takeaway?: boolean;
        delivery?: boolean;
        driveThrough?: boolean;

        /** Payment */
        acceptsCards?: boolean;
        acceptsUPI?: boolean;
        acceptsCash?: boolean;
    };

    // ─────────────────────────────────────────────────────────────
    // TEMPORARY STATUS LAYER (Feature: Temp Status Banners)
    // @see __docs__/temp-status-layer/temp-status-layer_impl.md
    // ─────────────────────────────────────────────────────────────

    /**
     * Temporary status banner displayed on OBP and digital menu pages.
     * Auto-expires based on expiresAt. Owner sets via dashboard or mobile.
     *
     * When set: Yellow/orange banner appears above content on public pages.
     * When expired/cleared: Field is removed from store document.
     *
     * Feature flag: ENABLE_TEMP_STATUS
     */
    tempStatus?: {
        type: 'closed_today' | 'opening_late' | 'closing_early' | 'kitchen_closed' | 'special_menu' | 'custom';
        message?: string;        // Custom message (max 100 chars)
        expiresAt: string;       // ISO 8601 string
        createdAt: string;       // ISO 8601 string
        createdBy?: string;      // userId who set the status
    };

    // ─────────────────────────────────────────────────────────────
    // PLATFORM PULL API (Feature: Public Read-Only APIs)
    // @see __docs__/platform-pull-api/platform-pull-api_impl.md
    // ─────────────────────────────────────────────────────────────

    /**
     * Public API configuration for external system access.
     * Owner generates a read-only API key in Business Settings.
     * External systems use X-API-Key header to pull data.
     *
     * Feature flag: ENABLE_PUBLIC_API
     */
    publicApi?: {
        apiKey: string;         // UUID v4, generated by owner
        createdAt: string;      // ISO 8601
    };

    // ─────────────────────────────────────────────────────────────
    // CANONICA WIDGET CONFIGURATION
    // @see __docs__/canonica/help-widget/help-widget_impl.md
    // ─────────────────────────────────────────────────────────────

    /**
     * Widget launcher customization config.
     * Set by SaaS founder in Canonica dashboard settings.
     * Read by embed script via data attributes.
     *
     * Feature flag: ENABLE_CANONICA_WIDGET
     */
    widgetConfig?: {
        position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
        accentColor?: string;
        shape?: 'rounded' | 'pill';
        display?: 'icon' | 'text' | 'icon-text';
        label?: string;
        size?: 'small' | 'medium' | 'large';
        offsetX?: number;
        offsetY?: number;
    };

    /**
     * Allowed origins for widget embedding (security).
     * If configured, widget requests from unlisted origins are rejected (403).
     * Empty array = allow all origins (backward compatible).
     *
     * Feature flag: ENABLE_CANONICA_WIDGET
     */
    widgetAllowedOrigins?: string[];

    // ─────────────────────────────────────────────────────────────
    // SPECIAL MENU SWITCHING (Feature: Temporary Menu Override)
    // @see __docs__/special-menu-switching/special-menu-switching_impl.md
    // ─────────────────────────────────────────────────────────────

    /**
     * Currently active special menu project ID.
     * Set by activation system, cleared on deactivation.
     * Used by client-side resolver to quickly check for override (zero extra reads).
     *
     * Feature flag: ENABLE_SPECIAL_MENU_SWITCHING
     */
    activeSpecialMenuId?: string;

    // ─────────────────────────────────────────────────────────────
    // LIFECYCLE MESSAGING (Operational Messaging Infrastructure)
    // @see __docs__/lifecycle-messaging/lifecycle-messaging_impl.md §2.1
    // ─────────────────────────────────────────────────────────────

    /**
     * Notification routing settings for lifecycle messaging.
     * Default: primaryEmail = contactPersonEmail, channel = email.
     * Owners can override in Business Settings → Notifications (Phase 2 UI).
     */
    notificationSettings?: {
        /** Primary email for operational messages. Default: contactPersonEmail */
        primaryEmail: string;
        /** Separate billing email (invoices, payment alerts). Default: same as primaryEmail */
        billingEmail?: string;
        /** Preferred notification channel. Phase 1: email only */
        preferredChannel: 'email';
        /** When owner consented to receive messages (ISO 8601) */
        consentedAt?: string;
        /** Suppress non-critical messages 9pm-9am local time. Default: true */
        quietHoursEnabled?: boolean;
    };

    // ─────────────────────────────────────────────────────────────
    // BUSINESS HEALTH SIGNALS (Customer-Facing Infrastructure Pillars 4-6)
    // Aggregate-only, privacy-safe business health indicators.
    // Written weekly by Cloud Function. Read from already-loaded store doc (zero extra cost).
    //
    // Feature flags: ENABLE_TRUST_HEALTH_SIGNAL, ENABLE_LOYALTY_HEALTH_SIGNAL, ENABLE_RISK_DECLINE_DETECTION
    // @see __docs__/trust-health-signal/trust-health-signal_impl.md
    // @see __docs__/loyalty-health-signal/loyalty-health-signal_impl.md
    // @see __docs__/risk-decline-detection/risk-decline-detection_impl.md
    // ─────────────────────────────────────────────────────────────

    healthSignals?: {
        trust?: {
            state: 'strong' | 'stable' | 'weak';
            computedAt: string;   // ISO 8601 string
            dataPoints: number;   // weeks of data used
            visible: boolean;     // meets visibility threshold (50+ visitors/week for 4+ weeks)
        };
        loyalty?: {
            state: 'strong' | 'stable' | 'weak';
            computedAt: string;   // ISO 8601 string
            dataPoints: number;   // weeks of data used
            visible: boolean;     // meets visibility threshold
        };
        risk?: {
            state: 'stable' | 'watch' | 'at_risk';
            computedAt: string;            // ISO 8601 string
            visible: boolean;              // requires both trust + loyalty visible
            consecutiveWeakWeeks: number;  // track duration of weakness
        };
    };

    // ── ONBOARDING TRACKING ──────────────────────────────────────
    // @see __docs__/reseller-dashboard/
    onboardingSource?: 'WEBSITE_ONBOARDING' | 'RESELLER_ONBOARDING' | 'MESSAGING_ONBOARDING';
    resellerId?: string;              // Reseller profile ID (if onboarded by reseller)

    // ─────────────────────────────────────────────────────────────
    // MENU PRESENCE MONITOR
    // Manual confirmation of where the menu link has been deployed.
    // Auto-detected surfaces (QR, Screens, Feedback) derive status from existing data.
    // Feature flag: ENABLE_MENU_PRESENCE_MONITOR
    // @see __docs__/menu-presence-monitor/menu-presence-monitor_impl.md
    // ─────────────────────────────────────────────────────────────

    /** Timestamp-only presence. Exists = confirmed, missing = not confirmed.
     *  Surface IDs are IMMUTABLE — never rename. Max 6 surfaces forever. */
    menuPresence?: {
        googleBusiness?: string;   // ISO 8601 timestamp when owner confirmed
        instagramBio?: string;     // ISO 8601 timestamp when owner confirmed
        whatsappProfile?: string;  // ISO 8601 timestamp when owner confirmed
    };
};

export type MinimalStoreDataType = Pick<
    StoreDataType,
    "name" | "storeKey" | "storeId"
> & {
    isMaster?: boolean;
    /** Brand subdomain for master store, outletSlug for outlet stores */
    subdomain?: string;
    storeDetails?: StoreDataType;
};
