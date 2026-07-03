/**
 * Project Types
 *
 * Core project structure types (Project, ProjectMetadata, ProjectFileType).
 */

import type { MasterSnapshot } from "@type/multiOutlet.types";
import { Timestamp } from "firebase/firestore";
import type { LocalizedText } from "@lib/localization/text";
import type { UserUploadedFileType } from "@type/common";
import { CategoryTimeSlot, ExtractedData } from "./extractedData.types";
import { ThemeConfig } from "./theme.types";

// Re-export CategoryTimeSlot for backward compatibility
export type { CategoryTimeSlot };

/**
 * Pricing Integrity State
 *
 * Tracks the integrity of pricing across surfaces.
 * Part of Pricing Integrity System (Feature #1).
 */
export interface PricingIntegrityState {
    /** When the last price change occurred */
    lastPriceChangeOn: Timestamp | null;

    /** User ID who made the last price change */
    lastPriceChangeBy: string | null;

    /** PDF generation state */
    pdf: {
        /** Current PDF status */
        status: "FRESH" | "STALE" | "GENERATING" | "FAILED";

        /** When PDF was last generated */
        lastGeneratedOn: Timestamp | null;

        /** ID of the last generation job */
        lastGenerationJobId: string | null;

        /** Error message if last generation failed */
        lastFailureReason: string | null;

        /** Version counter (increments on each price change) */
        version: number;

        /** Firebase Storage URL of current PDF */
        url: string | null;
    };

    /** Screen cache invalidation state */
    screens: {
        /** When screens were last invalidated */
        lastBustedOn: Timestamp | null;

        /** Version counter for screen polling */
        version: number;
    };
}

/**
 * ProjectMetadata - Lightweight project info for listing/display
 *
 * DEPRECATED: This interface is being replaced by projectsSummary pattern.
 * See: platformSummary/projects_{sId} documents
 *
 * Lifecycle flags (active/deleted) now live ONLY on Project interface
 * for Cloud Function query efficiency.
 */
export interface ProjectMetadata {
    projectId?: string;
    name: string | LocalizedText;
    description?: string | LocalizedText;
    defaultLanguage?: string;
    projectImage?: string | null;
    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
    modifiedBy?: string;
    isDefault?: boolean; // Show at root URL when accessing via subdomain/custom domain
    active?: boolean;

    // ── URL PERMANENCE (Feature: URL Routing Architecture) ──────────
    // @see __docs__/url-routing-architecture/README.md ADR-3

    /** Permanent URL slug. Auto-generated from name on creation. */
    slug?: string;

    /** Previous slugs for 301 redirect support. Never reuse within same store. */
    previousSlugs?: string[];

    /** Timestamp when slug was first locked (set on creation). */
    slugLockedAt?: Timestamp;

    /** Pricing integrity tracking state */
    pricingIntegrity?: PricingIntegrityState;
}

/**
 * ProjectSummaryData - Data stored in platformSummary/projects_{sId}
 * Used for efficient project listing (1 read per store)
 */
export interface ProjectSummaryData {
    name: string | LocalizedText;
    description?: string | LocalizedText;
    projectImage?: string | null;
    businessCategory?: string;
    businessType?: string;
    active: boolean;
    isDefault?: boolean;

    // ── URL PERMANENCE (Feature: URL Routing Architecture) ──────────
    /** Permanent URL slug for this project */
    slug?: string;
    /** Previous slugs for 301 redirect lookup */
    previousSlugs?: string[];

    // ── SPECIAL MENU SWITCHING (Feature: Temporary Menu Override) ──
    /** True if this is a special menu project */
    isSpecialMenu?: boolean;
    /** Special menu display name (e.g., "Diwali Menu") */
    specialMenuDisplayName?: string | LocalizedText;
    /** Special menu lifecycle status for dashboard display */
    specialMenuStatus?: SpecialMenuStatus;
    /** Schedule start time (ISO 8601) for quick dashboard display */
    specialMenuStartsAt?: string;
    /** Schedule end time (ISO 8601) for quick dashboard display */
    specialMenuEndsAt?: string;
    /** Special menu mode */
    specialMenuMode?: SpecialMenuMode;
    /** Base project ID this special menu was created from */
    specialMenuBaseProjectId?: string;
}

export interface ProjectFileType {
    uid?: any;
    active?: boolean;
    deleted?: boolean;
    deletedAt?: string;
    index?: number;
    name?: string;
    size?: number;
    type?: string;
    url?: string;
    extractedData?: ExtractedData | null;
    inputToken?: any;
    ouputToken?: any;
    charges?: any;
    chargePerToken?: any;
    processingTime?: number; // Time taken to process in milliseconds
    combinedWithFileId?: string; // Reference to file containing combined extraction (for parallel processing)
}

/**
 * Menu Settings - Business/Operational Data (NOT design/theme)
 *
 * CONSTITUTIONAL: These are pricing truth and legal disclosures.
 * They must NOT live in ThemeConfig (styling-immune).
 */
export interface MenuSettings {
    // G06 - Service charge/pricing note (max 140 chars)
    // This is pricing truth, not design-configurable
    specialNote?: string | LocalizedText;

    // Decision Intelligence - Owner controls
    decisionBlocks?: {
        // Enable/disable specific blocks
        enablePopular?: boolean; // Default: true
        enableQuickPick?: boolean; // Default: true
        enableBestValue?: boolean; // Default: true

        // Pin specific items to blocks (overrides scoring)
        pinnedPopular?: string; // Item ID to always show for Popular
        pinnedQuickPick?: string; // Item ID to always show for Quick Pick
        pinnedBestValue?: string; // Item ID to always show for Best Value
    };

    // ─────────────────────────────────────────────────────────────
    // GUEST FEEDBACK TOGGLE (Feature: Internal Feedback System)
    // ─────────────────────────────────────────────────────────────

    /**
     * Enable/disable guest feedback for this menu (default: true)
     *
     * NOTE: Contact field settings are at store level (see Store.feedbackDefaults).
     *
     * UI: This toggle should be in "Advanced Settings", framed as
     * "Disable feedback for this menu" to discourage casual disabling.
     *
     * Usage: if (menuSettings.feedback !== false) → feedback is ON
     */
    feedback?: boolean;
}

export interface ProjectAIDescriptionPreferences {
    contentLength?: 'Standard' | 'Detailed';
    tone?: 'Professional' | 'Friendly' | 'Premium';
}

export interface ProjectAIImagePreferences {
    stylesCategory?: string;
    styles?: string[];
    aspectRatio?: string;
    environments?: string[];
    lighting?: string[];
    colors?: string[];
    moods?: string[];
    compositions?: string[];
    backgroundColor?: string | null;
    negativePrompt?: string;
    transparentBg?: boolean;
    foregroundColor?: string | null;
    isMultiMode?: boolean;
}

export interface ProjectAIPreferences {
    description?: ProjectAIDescriptionPreferences;
    image?: ProjectAIImagePreferences;
}

// ══════════════════════════════════════════════════════════════════════════
// MULTI-STORE OVERRIDE TYPES (Feature #4)
// Store projects only contain overrides — no full menu data.
// At render time: Load master files → Apply store overrides by ID
// ══════════════════════════════════════════════════════════════════════════

// CategoryTimeSlot is imported from extractedData.types.ts (single source of truth)
// and re-exported above for backward compatibility

/**
 * Category overrides - Store can modify these fields for inherited categories
 */
export interface CategoryOverride {
    active?: boolean; // Hide category at this store
    orderIndex?: number; // Local category ordering
    timeSlots?: CategoryTimeSlot[]; // Store-specific operating hours
}

/**
 * Item overrides - Store can modify these fields for inherited items
 */
export interface ItemOverride {
    active?: boolean; // Hide item permanently at this store
    available?: boolean; // Temporary sold-out status
    price?: string; // Override master price
    description?: { [key: string]: string }; // Store-specific item description
    images?: UserUploadedFileType[]; // Store-specific item images
    orderIndex?: number; // Local item ordering within category
    isBestSeller?: boolean; // Store can mark local bestsellers
    duration?: number; // Prep time may vary by store
    ownerBoost?: number; // Store can boost/suppress local favorites
}

/**
 * Attribute overrides - Store can modify item variants (Small/Medium/Large)
 */
export interface AttributeOverride {
    active?: boolean; // Hide specific variant at this store
    price?: string; // Override variant price
    orderIndex?: number; // Local variant ordering
}

/**
 * Project overrides container - All store-level customizations
 */
export interface ProjectOverrides {
    items: Record<string, ItemOverride>;
    categories: Record<string, CategoryOverride>;
    attributes: Record<string, AttributeOverride>; // Key: attributeId
}

/** Job mode for tracking extraction type */
export type ExtractionJobMode = 'SINGLE_STORE' | 'MASTER_PROJECT' | 'OUTLET_LINKED';

export type OutletLocalChangeReason =
    | 'outlet_save'
    | 'extraction_apply'
    | 'override_apply';

export interface OutletLocalState {
    /** Outlet-local monotonically increasing revision. Lives only on the outlet project. */
    localVersion?: number;
    /** Last outlet-local menu/override change timestamp. */
    lastLocalChangeAt?: Timestamp;
    /** User ID responsible for the last outlet-local change. */
    lastLocalChangeBy?: string;
    /** Runtime path that created the latest outlet-local change. */
    lastLocalChangeReason?: OutletLocalChangeReason;
}

// ══════════════════════════════════════════════════════════════════════════
// SPECIAL MENU SWITCHING TYPES (Feature: Temporary Menu Override)
// @see __docs__/special-menu-switching/special-menu-switching_impl.md
// ══════════════════════════════════════════════════════════════════════════

/** Special menu display mode */
export type SpecialMenuMode = 'replace' | 'overlay';

/** Special menu lifecycle status */
export type SpecialMenuStatus = 'scheduled' | 'active' | 'expired' | 'cancelled';

/** Behavior template (derived from businessType, not owner-facing) */
export type SpecialMenuBehaviorTemplate = 'dynamic' | 'occasional' | 'minimal';

/**
 * Special Menu Metadata — scheduling + lifecycle for temporary menu override.
 * Stored as `_specialMenu` field on Project documents.
 */
export interface SpecialMenuMetadata {
    /** ID of the base project this was created from */
    baseProjectId: string;

    /** Display mode: replace = full swap, overlay = add section to base */
    mode: SpecialMenuMode;

    /** Scheduled activation time (ISO 8601) */
    startsAt: string;

    /** Scheduled deactivation time (ISO 8601) */
    endsAt: string;

    /** Current lifecycle status */
    status: SpecialMenuStatus;

    /** @deprecated No longer stored — derive at runtime via getBehaviorTemplate(store.businessType) */
    behaviorTemplate?: SpecialMenuBehaviorTemplate;

    /** User-facing name for the special menu period */
    displayName: string | LocalizedText;

    /** Timestamp of actual activation (ISO 8601, set by system) */
    activatedAt?: string;

    /** Timestamp of actual deactivation (ISO 8601, set by system) */
    deactivatedAt?: string;
}

export interface Project {
    projectId?: string;
    name?: string | LocalizedText;
    description?: string | LocalizedText;
    defaultLanguage?: string;
    files?: ProjectFileType[];
    languages?: string[];
    config?: ThemeConfig;
    // G06 - Business/operational settings (separate from design)
    menuSettings?: MenuSettings;
    aiPreferences?: ProjectAIPreferences;
    // Project lifecycle flags (moved from ProjectMetadata for query efficiency)
    active?: boolean; // Default: true - set to false to disable project
    deleted?: boolean; // Soft delete flag
    deletedAt?: Timestamp; // When the project was deleted
    isDefault?: boolean; // Show at root URL when accessing via subdomain/custom domain
    /** Snapshot of platformSummary data kept while soft-deleted for lossless restore. */
    deletedSummary?: Partial<ProjectSummaryData>;

    // ══════════════════════════════════════════════════════════
    // MULTI-STORE FIELDS (Feature #4) - All OPTIONAL
    // ══════════════════════════════════════════════════════════

    // NOTE: isMaster is NOT stored on project level.
    // Master store is identified via storesSummary.stores[sId].isMaster
    // All projects in master store are considered master projects.

    /**
     * Master project ID (for regular store projects only)
     *
     * If this field EXISTS → regular store project linked to master
     * If this field is ABSENT → master project (or unlinked)
     *
     * storeId can be extracted from projectId format: {tId}-{timestamp}-{sId}
     * Enables direct Firestore querying: where('masterProjectId', '==', 'xxx')
     */
    masterProjectId?: string;

    /** Project origin type for multi-outlet (Feature #4C) */
    projectType?: 'local' | 'inherited';

    /** Outlet-level project status — outlets can deactivate but NOT delete inherited projects */
    outletStatus?: 'active' | 'inactive';

    /** Store-specific overrides for inherited items/categories/attributes */
    overrides?: ProjectOverrides;

    /** Per-outlet local staleness marker. Never written on the master project. */
    outletLocalState?: OutletLocalState;

    /**
     * Per-outlet snapshot of master menu at last acknowledgment (Feature #4.1)
     * Written when outlet owner clicks "Got it" on the awareness banner.
     * Used to compute diff against current master state.
     * @see __docs__/multi-outlet-consistency/master-updates-awareness_impl.md
     */
    masterSnapshot?: MasterSnapshot;

    // ══════════════════════════════════════════════════════════
    // SPECIAL MENU SWITCHING (Feature: Temporary Menu Override)
    // @see __docs__/special-menu-switching/special-menu-switching_impl.md
    // ══════════════════════════════════════════════════════════

    /**
     * Special Menu Metadata — only present on special menu projects.
     * When present, this project is a temporary override menu.
     *
     * A special menu IS a regular project with scheduling metadata.
     * Reuses 100% of existing editor, AI extraction, MCE, publish, screens, PDF.
     *
     * Feature flag: ENABLE_SPECIAL_MENU_SWITCHING
     * @see __docs__/special-menu-switching/special-menu-switching_impl.md
     */
    _specialMenu?: SpecialMenuMetadata;

    // ══════════════════════════════════════════════════════════
    // MENU CORRECTNESS ENGINE (MCE) — Verification Metadata
    // ══════════════════════════════════════════════════════════

    /**
     * MCE verification metadata — stamped on every save when ENABLE_MCE is true.
     * Part of the same setDoc() call — zero extra Firebase writes.
     *
     * - verified: Did all critical rules pass?
     * - verifiedAt: Timestamp of last verification
     * - warnings: Non-blocking warning rule IDs
     *
     * Internal only — stripped by sanitizeForClient() before customer exposure.
     * @see __docs__/menu-correctness-engine/menu-correctness-engine_impl.md §2.2
     */
    _mce?: {
        verified: boolean;
        verifiedAt: number;
        warnings: string[];
    };

    // ══════════════════════════════════════════════════════════
    // CANONICAL TRUTH INFRASTRUCTURE — Versioning
    // @see __docs__/canonical-truth-infrastructure/
    // ══════════════════════════════════════════════════════════

    /**
     * Global publish version — monotonically increasing integer.
     * Incremented on every publishProject() call via Firestore increment().
     * All surfaces reference this version to detect staleness.
     *
     * - Never decremented, never mutated
     * - Corrections create new versions (append-only)
     * - Starts at 1 on first publish
     */
    menuVersion?: number;

    /**
     * Timestamp of last publish (server-side).
     * Used by surfaces to display "Last updated" and by agents to verify currency.
     */
    lastPublishedAt?: Timestamp;
}
