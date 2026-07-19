import { Timestamp } from "firebase/firestore";
import type { GrowthAcquisitionAttribution } from "@lib/growth/acquisitionAttribution";
import type { LocalizedStringList, LocalizedText } from "@lib/localization/text";
import type { OutletPolicy } from "../multiOutlet.types";
import type { PlatformBlockDetails } from "./blocking";
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

export type StoreTemporaryStatus = {
    type: 'closed_today' | 'opening_late' | 'closing_early' | 'kitchen_closed' | 'special_menu' | 'custom';
    message?: string;
    expiresAt: string;
    createdAt: string;
    createdBy?: string | null;
    sourceProjectId?: string;
};

export type StorePublicApiCredentialProductId = 'ML' | 'AL';
export type StorePublicApiCredentialPurpose =
    | 'menulist_public_api'
    | 'answerlattice_public_api'
    | 'answerlattice_widget';
export type StorePublicApiCredentialScope =
    | 'public:read'
    | 'signals:write'
    | 'mcp:read'
    | 'widget:config'
    | 'widget:content'
    | 'widget:search'
    | 'widget:feedback'
    | 'widget:predictive';

export type ExternalLocationIdentityProvider = 'google_maps' | 'google_business_profile';

export type ExternalLocationIdentityBinding = {
    provider: ExternalLocationIdentityProvider;
    providerLocationId?: string;
    providerUri?: string;
    resolution: 'provider_uri' | 'provider_location_id';
    confirmationStatus: 'owner_confirmed';
    source: 'owner_maps_link' | 'maps_place_check' | 'gbp_connection';
    confirmedAt: string;
};

export type StoreExternalLocationIdentity = {
    schemaVersion: 'menulist.external-location-identity.v1';
    bindings?: Partial<Record<ExternalLocationIdentityProvider, ExternalLocationIdentityBinding>>;
};

export type StoreDataType = {
    storeId: number;
    storeKey: string;
    tenantId: number;
    tenantName: string;
    active: boolean;
    blocked?: boolean;
    blockDetails?: PlatformBlockDetails;
    deleted: boolean;
    verified?: boolean;

    name: string;
    email: string;
    countryCode?: string;
    dialCode?: string;
    phoneNumber: string;
    alternatePhoneNumber?: string;
    gstn?: string;
    domain?: string;
    url?: string;
    createdBy?: string;
    createdOn?: string;
    lastPublishedAt?: Timestamp | Date | string | null;
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
    /**
     * Store-local business day cutoff in HH:mm.
     * Analytics before this time are counted into the previous business day.
     */
    businessDayEndTime?: string;
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
    businessIndustry?: string; // Plan type marker: 'B2C' | 'B2B'.
    activePlanType?: string; // Denormalized plan id for scheduler entitlements. Billing subscription remains the source of truth.

    contactPersonName: string;
    contactPersonEmail: string;
    contactPersonNumber: string;

    roles: StoreRoleDataType[];
    // NOTE: rolesPermissionStrategy removed - not needed with single role per store

    workingHours?: Record<string, string>;
    socialMedia?: Record<string, string>;

    // SEO Settings (from Business Settings)
    metaTitle?: string | LocalizedText;
    metaDescription?: string | LocalizedText;
    keywords?: string[] | LocalizedStringList;
    canonicalUrl?: string;
    tagline?: string | LocalizedText;

    pwaSettings?: {
        enableInstallableApp?: boolean;
        promoteInstallation?: boolean;
        pwaShortName?: string | LocalizedText;
    };

    businessCopyMeta?: {
        lastGeneratedAt?: string;
        lastGeneratedFieldKeys?: string[];
        lastGeneratedProjectId?: string;
        lastGeneratedSourceLanguage?: string;
        lastGeneratedTargetLanguages?: string[];
        lastManualOverrideAt?: string;
        lastManualOverrideFieldKeys?: string[];
        lastRepairedAt?: string;
        lastRepairedFieldKeys?: string[];
        lastRepairedGapCount?: number;
        lastRepairedSourceLanguage?: string;
        lastRepairedTargetLanguages?: string[];
    };

    // Multi-tenant Domain Settings
    subdomain?: string; // e.g., "joespizza" → joespizza.menulist.ai
    customDomain?: string; // e.g., "joespizza.com"
    domainVerified?: boolean; // DNS verification status
    primaryProjectId?: string; // Default project to show on domain

    /** T1-N-05 / A-03 PUBLIC-ROUTING-DOCTRINE: admin-tier subdomain rename
     *  chain. The owner-facing flow blocks subdomain renames after first
     *  publish (G-08); the only way to rename is the support-tier
     *  `/api/admin/subdomains/rename` endpoint. Each entry records the old
     *  subdomain value plus a 12-month expiry so legacy URLs 301 to the
     *  current subdomain during the window. After expiry the old subdomain
     *  stops resolving and may be claimed by another tenant.
     *
     *  @see __docs__/client-menu/public-routing-doctrine.md §A-03, T1-N-05
     */
    previousSubdomains?: Array<{
        /** The prior subdomain value, lowercased. */
        subdomain: string;
        /** When the admin-tier rename happened. */
        renamedAt: Timestamp;
        /** When this old-subdomain redirect stops resolving. */
        expiresAt: Timestamp;
        /** Free-form justification for the support log. */
        reason?: string;
        /** Owner-facing acknowledgement token or support-ticket reference. */
        ackRef?: string;
    }>;

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
        trackCustomerApp?: boolean;
        trackDecisionBlocks?: boolean;
        trackMenuViews?: boolean;
        trackLocation?: boolean;
        trackOfficialBusinessPage?: boolean;
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

    /**
     * Provider-neutral external location bindings for this exact store/outlet.
     *
     * Only explicit owner-confirmed bindings are persisted. Provider proposals,
     * grounded text, match candidates, reviews, ratings, and source snapshots
     * are never stored here. This field is internal metadata and is not part of
     * the public OBP, menu JSON-LD, or Platform Pull API contract.
     */
    externalLocationIdentity?: StoreExternalLocationIdentity;

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
        descriptor?: string | LocalizedText;

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
        showReservation?: boolean;
        showOrder?: boolean;
        showGoogleReview?: boolean;
        showFeedback?: boolean;
        showPrivacyLink?: boolean;
        showTermsLink?: boolean;
        showRefundLink?: boolean;

        /** Public OBP icon style. Icons are the default; emoji mode swaps public action/detail/attribute symbols to emoji. */
        iconVariant?: 'icons' | 'emoji';

        /** Reservation/booking URL (e.g., Dineout, Zomato, OpenTable, own website). For schema.org acceptsReservations + CTA. */
        reservationUrl?: string;

        /** Online ordering URL (e.g., Swiggy, Zomato, own website). For schema.org potentialAction OrderAction. */
        orderUrl?: string;

        /** Short owner-managed note shown on the OBP, separate from per-menu pricing notes. */
        specialNote?: string | LocalizedText;

        /** Year the business was established. For schema.org foundingDate + OBP "Serving since" display. */
        establishedYear?: number;

        /** Short identity cue, max 40 chars. e.g. "Known for: wood-fired pizza". Helps category clarification on OBP. */
        knownFor?: string | LocalizedText;

        // ── GOOGLE REVIEW REFERENCE (ADR-12: Reference, not hosting) ──
        // @see __docs__/official-business-page/obp-infrastructure-freeze-plan.md §Priority 1

        /** Google review page URL. Links to the business's Google reviews. */
        googleReviewUrl?: string;

        /** Google star rating (owner-entered, e.g. 4.5). Displayed as trust badge on OBP; not emitted as AggregateRating markup. */
        googleRating?: number;

        /** Google review count (owner-entered, e.g. 320). Displayed alongside rating; not emitted as AggregateRating markup. */
        googleReviewCount?: number;

        // ── BUSINESS PHOTOS (ADR-13: first 3 are OBP preview; full set opens in viewer) ──
        // @see __docs__/official-business-page/obp-infrastructure-freeze-plan.md §Priority 2

        /** Owner-managed Official Business Page cover image. Shown as the first visual on the public page. */
        businessCover?: string;

        /** Owner-managed business photos. OBP previews the first 3; tapping a photo opens the full viewer. */
        photos?: string[];

        /** Owner-defined public attributes shown after controlled business attributes. Max 6 in UI. */
        customAttributes?: Array<{
            id: string;
            label: string;
            icon?: string;
            active?: boolean;
        }>;

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
        /** @deprecated Legacy migration source only. New secrets are server-owned. */
        webhookSecret?: string;
        secretVersion?: number;
        status: 'healthy' | 'retrying' | 'connection_issue' | 'disabled';
        lastSentAt: Timestamp | null;
        lastStatus: 'success' | 'failed' | 'never_sent';
        lastError: string;
        menuVersion: number;
        lastCompletedMenuVersion?: number;
        consecutiveFailures?: number;
        instructionsSentCount: number;
        instructionsSentDate: string;
        secretRotatedAt?: string;
        secretRotatedByEmail?: string;
        secretRotatedByUserId?: string;
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
     * When expired: public projections hide it even if persisted cleanup has not run.
     * When cleared: the owner mutation deletes the field from the store document.
     *
     * Feature flag: ENABLE_TEMP_STATUS
     */
    tempStatus?: StoreTemporaryStatus;

    // ─────────────────────────────────────────────────────────────
    // PLATFORM PULL API (Feature: Public Read-Only APIs)
    // @see __docs__/platform-pull-api/platform-pull-api_impl.md
    // ─────────────────────────────────────────────────────────────

    /**
     * Public API configuration for external system access.
     * MenuList owners manage keys in Business Settings. Answerlattice owners
     * manage a separate rollout-gated key from the Answerlattice Public API page.
     * External systems use X-API-Key header to pull data.
     * Raw public API keys are legacy-only; new public API keys are stored as SHA-256 hashes and shown once.
     * Answerlattice widget keys use the dedicated `answerlatticeWidgetApi` manager below.
     *
     * Feature flags: ENABLE_PUBLIC_API, ENABLE_ANSWERLATTICE_PUBLIC_API
     */
    publicApi?: {
        apiKey?: string;        // Legacy raw key fallback only
        apiKeyHash?: string;    // SHA-256 hash used by current validation path
        keyPrefix?: string;     // Display-only prefix, e.g. al_1234
        createdAt?: string;     // ISO 8601
        productId?: StorePublicApiCredentialProductId;
        purpose?: StorePublicApiCredentialPurpose;
        scopes?: StorePublicApiCredentialScope[];
    };

    /**
     * Dedicated Answerlattice widget credential.
     * Kept separate from `publicApi` so embeddable widget keys cannot authorize
     * broader Answerlattice public API routes.
     */
    answerlatticeWidgetApi?: {
        schemaVersion?: 'answerlattice.widgetKeys.v1';
        activeKeyHash?: string | null;
        keyHashes?: string[];
        keysByHash?: Record<string, {
            id: string;
            name: string;
            keyPrefix: string;
            keySuffix?: string | null;
            encryptedKey?: string | null;
            encryptionVersion?: string | null;
            status: 'active' | 'revoked';
            productId?: 'AL' | string;
            purpose?: 'answerlattice_widget' | string;
            scopes?: string[];
            createdAt?: string;
            updatedAt?: string | null;
            revokedAt?: string | null;
            legacy?: boolean;
        }>;
        // Legacy/current active key fields retained for backward compatibility.
        apiKeyHash?: string;
        keyPrefix?: string;
        createdAt?: string;
        updatedAt?: string | null;
        productId?: 'AL' | string;
        purpose?: 'answerlattice_widget' | string;
        scopes?: string[];
    };

    // ─────────────────────────────────────────────────────────────
    // ANSWERLATTICE WIDGET CONFIGURATION
    // @see __docs__/answerlattice/help-widget/help-widget_impl.md
    // ─────────────────────────────────────────────────────────────

    /**
     * Widget launcher customization config.
     * Set by SaaS founder in Answerlattice dashboard settings.
     * Read by embed script via data attributes.
     *
     * Feature flag: ENABLE_ANSWERLATTICE_WIDGET
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
        zIndex?: number;
        historyMode?: 'session' | 'forget';
        launcherVisibility?: 'visible' | 'manual';
        mobileVisibility?: 'show' | 'hide';
        blockedRoutes?: string[];
    };

    /**
     * Allowed origins for widget embedding (security).
     * If configured, widget requests from unlisted origins are rejected (403).
     * Empty array = allow all origins (backward compatible).
     *
     * Feature flag: ENABLE_ANSWERLATTICE_WIDGET
     */
    widgetAllowedOrigins?: string[];

    /**
     * Answerlattice hosted Help Center settings.
     * Powers anonymous customer-facing docs domains such as help.example.com.
     * Domain resolution uses answerlattice_publicHelpSites registry docs, not this
     * store document, to keep public page reads to one cached lookup.
     *
     * Feature flag: ENABLE_ANSWERLATTICE_HOSTED_HELP_CENTER
     */
    hostedHelpConfig?: {
        enabled?: boolean;
        domains?: string[];
        primaryDomain?: string | null;
        title?: string;
        description?: string;
        showFaqs?: boolean;
        showChangelog?: boolean;
        noIndex?: boolean;
    };
    hostedHelpConfigVersion?: number;
    hostedHelpUpdatedAt?: string;

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
     * Owners can override in Business Settings > Notifications when that surface is enabled.
     */
    notificationSettings?: {
        /** Primary email for operational messages. Default: contactPersonEmail */
        primaryEmail: string;
        /** Separate billing email (invoices, payment alerts). Default: same as primaryEmail */
        billingEmail?: string;
        /** Preferred notification channel. Current implementation: email only */
        preferredChannel: 'email';
        /** When owner consented to receive messages (ISO 8601) */
        consentedAt?: string;
        /** Suppress non-critical messages 9pm-9am local time. Default: true */
        quietHoursEnabled?: boolean;
    };

    // ─────────────────────────────────────────────────────────────
    // BUSINESS HEALTH SIGNALS (Customer-Facing Infrastructure Pillars 4-6)
    // Reserved dormant compatibility shape; there is no active writer or reader.
    // Any later aggregate-only health signal must pass the documented counter,
    // privacy, scheduler, persistence, freshness, and owner-surface gates.
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
    onboardingSource?: 'WEBSITE_ONBOARDING' | 'RESELLER_ONBOARDING' | 'MESSAGING_ONBOARDING' | 'PUBLIC_MENU_ENTRY';
    starterActivationStatus?: 'preview_created' | 'starter_active' | 'payment_pending' | 'active_paid' | 'starter_expired' | 'archived';
    starterActivatedAt?: Timestamp;
    activationDeadline?: Timestamp;
    starterActivationSignals?: {
        actions?: Record<string, string>; // starter activation signal -> ISO 8601 timestamp
        lastSignalAt?: string;
    };
    resellerId?: string;              // Reseller profile ID (if onboarded by reseller)

    // ─────────────────────────────────────────────────────────────
    // MENU PRESENCE MONITOR
    // Manual confirmation of where the menu link has been deployed.
    // Auto-detected surfaces (QR, Screens, Feedback) derive status from existing data.
    // Feature flag: ENABLE_MENU_PRESENCE_MONITOR
    // @see __docs__/menu-presence-monitor/menu-presence-monitor_impl.md
    // ─────────────────────────────────────────────────────────────

    /** Timestamp-only presence. Exists = confirmed, missing = not confirmed.
     *  Surface IDs are IMMUTABLE — never rename. */
    menuPresence?: {
        googleBusiness?: string;   // ISO 8601 timestamp when owner confirmed
        appleBusiness?: string;    // ISO 8601 timestamp when owner confirmed
        bingPlaces?: string;       // ISO 8601 timestamp when owner confirmed
        instagramBio?: string;     // ISO 8601 timestamp when owner confirmed
        whatsappProfile?: string;  // ISO 8601 timestamp when owner confirmed
    };
    growthAcquisition?: GrowthAcquisitionAttribution;
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
