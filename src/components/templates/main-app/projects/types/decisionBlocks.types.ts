/**
 * Decision Blocks Types
 * 
 * Types for the Decision Blocks feature - precomputed block candidates
 * stored per menu, updated nightly by Cloud Function.
 * 
 * ARCHITECTURE (2-Layer System):
 * - Layer 1: Cloud Function computes candidates nightly (HEAVY computation)
 * - Layer 2: Client applies runtime filter for availability (LIGHT check)
 * - This handles rush-hour sellouts gracefully
 */

// ============================================
// DECISION BLOCK DATA
// ============================================

/**
 * A single candidate entry for a decision block
 */
export interface DecisionBlockEntry {
    itemId: string;                      // Reference to the menu item
    score?: number;                      // Internal writer detail; omitted from the public DTO
    reason: string;                      // i18n key (e.g., "decision.popular.food.favorite")
    reasonParams?: { minutes: number };  // Optional public interpolation value
    isPinned?: boolean;                  // True if owner manually pinned this item
}

/**
 * Precomputed Decision Blocks projection from Cloud Function
 * Stored in Firestore: projects/{tId}/{sId}/{projectId}.publicDecisionBlocks
 * 
 * ARCHITECTURE: Each project gets its own Decision Blocks
 * - 1 Tenant → Multiple Stores
 * - 1 Store → Multiple Projects
 */
export interface PrecomputedDecisionBlocks {
    tId: string;              // Tenant ID
    sId: string;              // Store ID
    projectId: string;        // Project ID - each project has its own blocks

    // Top 3 candidates per block (sorted by score descending)
    // Runtime selects first available item from each list
    popular: DecisionBlockEntry[];
    quickPick: DecisionBlockEntry[];
    bestValue: DecisionBlockEntry[];

    computedAt: string;       // ISO timestamp from the server public projector
    validUntil: string;       // ISO TTL from the server public projector

    statsUsed: {
        totalItems: number;
        itemsWithViews: number;
        itemsWithDuration: number;
        // Hardening fields — used by runtime for lifecycle gating + block eligibility
        totalViews?: number;
        totalClicks?: number;
        itemsWithClicks?: number;
        itemsWithPrice?: number;
        durationCoverage?: number;  // 0-1
        priceCoverage?: number;     // 0-1
        daysWithData?: number;      // Analytics days available (max 7)
    };
}

// ============================================
// NOTE: Scoring weights and item stats types live in the Cloud Function
// (functions/src/intelligence/shared/scoreNormalizer.ts)
// They are NOT needed on the client — runtime only filters precomputed candidates.
// ============================================
