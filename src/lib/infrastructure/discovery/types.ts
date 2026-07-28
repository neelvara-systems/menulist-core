/**
 * Business Entity Discovery Index — Types
 *
 * Cross-business queryable index for AI discovery and structured search.
 * Contains ONLY public business data — no PII, no billing, no internal data.
 * Part of MenuList Infrastructure Layer (Phase 2A).
 *
 * @see __docs__/discovery-infrastructure/business-entity-index.md
 */

/**
 * A single document in the businessEntityIndex collection.
 * One document per active store with a published menu.
 * Document ID: `{storeId}`
 *
 * COMPLIANCE: This structure contains ONLY public business information.
 * All fields here are already visible on OBP/menu public pages.
 */
export interface BusinessEntityIndexDoc {
    // ── Identity ──────────────────────────────────────────────
    storeId: number;
    tenantId: number;
    name: string;
    businessType: string;
    businessCategory: string;
    /** Short business descriptor from publicPresence */
    descriptor?: string;

    // ── Location ──────────────────────────────────────────────
    geo?: {
        latitude: number;
        longitude: number;
    };
    city?: string;
    state?: string;
    country?: string;

    // ── Taxonomy (Phase 1A) ───────────────────────────────────
    /** Canonical category IDs from offering taxonomy (SMB-universal) */
    standardCategories: string[];
    /** Canonical offering tag IDs — dietary (food), audience (service), level (health), universal (all)
     *  Examples: 'vegetarian' (food), 'for_men' (service), 'beginner' (health), 'popular' (all) */
    offeringTags: string[];
    /** Business-specific sub-classification IDs.
     *  Food: cuisine types (indian, italian). Service: n/a. Retail: product types. */
    subCategories: string[];

    // ── Semantic Attributes (Phase 1C) ────────────────────────
    /** Canonical semantic attribute IDs from store.businessAttributes */
    semanticAttributes: string[];

    // ── Offerings Summary ─────────────────────────────────────
    /** Top items (publicly visible name + price) */
    topItems: Array<{
        name: string;
        price: string;
    }>;
    /** Total active items in default menu */
    totalItems: number;
    /** Total active categories in default menu */
    totalCategories: number;

    // ── Freshness ─────────────────────────────────────────────
    /** Monotonic publish version from project.menuVersion */
    menuVersion?: number;
    /** Last publish time (ISO 8601) */
    lastPublishedAt?: string;
    /** Store truth confidence score (0–100) */
    truthScore?: number;
    /** Price range indicator */
    priceRange?: string;

    // ── Hours ─────────────────────────────────────────────────
    /** Working hours for "open now" queries */
    workingHours?: Record<string, string>;

    // ── Metadata ──────────────────────────────────────────────
    /** When this index document was last computed (ISO 8601) */
    indexedAt: string;
    /** Mirror of store.active — false entries are cleaned up */
    active: boolean;
}

/**
 * Input parameters for building a single business entity index document.
 * Collected from existing store + project data by the adapter.
 */
export interface IndexBuildInput {
    storeData: Pick<
        StoreDataType,
        | 'active'
        | 'activeLanguages'
        | 'businessAttributes'
        | 'businessType'
        | 'city'
        | 'country'
        | 'defaultLanguage'
        | 'geo'
        | 'language'
        | 'name'
        | 'priceRange'
        | 'publicPresence'
        | 'state'
        | 'storeId'
        | 'tenantId'
        | 'tenantName'
        | 'workingHours'
    >;
    projectData: {
        lastPublishedAt?: unknown;
        menuVersion?: number;
    };
    projectFiles: unknown[];
    businessCategory: string;
}
import type { StoreDataType } from '@type/platform/store';
