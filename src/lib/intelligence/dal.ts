/**
 * MENU INTELLIGENCE - DATA ACCESS LAYER
 * ═══════════════════════════════════════════════════════════════
 * 
 * Server-side DAL for reading Menu Intelligence state.
 * Used by campaign engine and slide generator to make decisions.
 * 
 * Per architecture: No API routes needed - server components read directly.
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    CMI_CONSTRAINTS,
    ConfidenceData,
    getConfidenceTier,
    ItemPresentation,
    MenuIntelligenceState
} from '@type/intelligence';

/**
 * Fetch Menu Intelligence state for a project
 * 
 * @param tId Tenant ID
 * @param sId Store ID
 * @param projectId Project ID
 * @returns Intelligence state or null if not computed yet
 */
export async function getMenuIntelligence(
    _tId: string | number,
    _sId: string | number,
    _projectId: string
): Promise<MenuIntelligenceState | null> {
    if (!FEATURE_FLAGS.ENABLE_CONTINUOUS_MENU_INTELLIGENCE) return null;
    // No app/owner/public consumer is certified for this private projection.
    // Keep all helpers neutral until a protected, allowlisted DTO boundary is
    // designed and reviewed; never revive a raw Firestore document cast here.
    return null;
}

/**
 * Get item confidence score
 * 
 * @param tId Tenant ID
 * @param sId Store ID
 * @param projectId Project ID
 * @param itemId Item ID
 * @returns Confidence data or null
 */
export async function getItemConfidence(
    tId: string | number,
    sId: string | number,
    projectId: string,
    itemId: string
): Promise<ConfidenceData | null> {
    const state = await getMenuIntelligence(tId, sId, projectId);
    if (!state) return null;
    return state.itemConfidence[itemId] || null;
}

/**
 * CMI V1.1: Get item presentation (priority-based ranking, NEVER hides items)
 * 
 * "MenuList can annotate truth, but not withhold truth."
 * Items always have visible: true. Priority determines ranking order.
 * 
 * @param tId Tenant ID
 * @param sId Store ID
 * @param projectId Project ID
 * @param itemId Item ID
 * @returns ItemPresentation with priority score and metadata
 */
export async function getItemPresentation(
    tId: string | number,
    sId: string | number,
    projectId: string,
    itemId: string
): Promise<ItemPresentation> {
    const state = await getMenuIntelligence(tId, sId, projectId);

    // No intelligence data → neutral presentation
    if (!state || new Date(state.validUntil).getTime() <= Date.now()) {
        return {
            visible: true,
            priority: 0.5,
            highlight: false,
            eligibleForRecommendation: false,
        };
    }

    const priority = state.itemPriority?.[itemId] ?? 0.5;
    const confidence = state.itemConfidence?.[itemId];

    return {
        visible: true,
        priority,
        highlight: priority >= CMI_CONSTRAINTS.HIGHLIGHT_THRESHOLD,
        eligibleForRecommendation: priority >= CMI_CONSTRAINTS.RECOMMENDATION_THRESHOLD,
        confidence: confidence?.score,
        tier: getConfidenceTier(confidence?.score),
    };
}

/**
 * CMI V1.1: Get all items sorted by priority (replaces getHighConfidenceItems)
 * 
 * Returns ALL items with intelligence data, sorted by priority descending.
 * Items are never filtered out — only ranked.
 * 
 * @param tId Tenant ID
 * @param sId Store ID
 * @param projectId Project ID
 * @returns Array of items sorted by priority (highest first)
 */
export async function getItemsByPriority(
    tId: string | number,
    sId: string | number,
    projectId: string
): Promise<Array<{ itemId: string; priority: number; confidence: ConfidenceData | null; presentation: ItemPresentation }>> {
    const state = await getMenuIntelligence(tId, sId, projectId);

    if (!state || new Date(state.validUntil).getTime() <= Date.now()) {
        return [];
    }

    const result: Array<{ itemId: string; priority: number; confidence: ConfidenceData | null; presentation: ItemPresentation }> = [];

    // Include all items that have priority scores
    for (const [itemId, priority] of Object.entries(state.itemPriority || {})) {
        const confidence = state.itemConfidence?.[itemId] || null;
        result.push({
            itemId,
            priority,
            confidence,
            presentation: {
                visible: true,
                priority,
                highlight: priority >= CMI_CONSTRAINTS.HIGHLIGHT_THRESHOLD,
                eligibleForRecommendation: priority >= CMI_CONSTRAINTS.RECOMMENDATION_THRESHOLD,
                confidence: confidence?.score,
                tier: getConfidenceTier(confidence?.score),
            }
        });
    }

    // Sort by priority descending
    return result.sort((a, b) => (
        b.priority - a.priority || (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0)
    ));
}

/**
 * Check if intelligence data is valid (not expired)
 * 
 * @param tId Tenant ID
 * @param sId Store ID  
 * @param projectId Project ID
 * @returns true if valid, false if expired or missing
 */
export async function isIntelligenceValid(
    tId: string | number,
    sId: string | number,
    projectId: string
): Promise<boolean> {
    const state = await getMenuIntelligence(tId, sId, projectId);

    if (!state) return false;

    const now = new Date();
    const validUntil = new Date(state.validUntil);

    return now < validUntil;
}
