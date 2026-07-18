/**
 * MENU INTELLIGENCE - DATA ACCESS LAYER
 * ═══════════════════════════════════════════════════════════════
 * 
 * Server-side DAL for reading Menu Intelligence state.
 * Used by campaign engine and slide generator to make decisions.
 * 
 * Per architecture: No API routes needed - server components read directly.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { FEATURE_FLAGS } from '@config/features';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import {
    CMI_CONSTRAINTS,
    ConfidenceData,
    getConfidenceTier,
    ItemPresentation,
    MenuIntelligenceState
} from '@type/intelligence';
import { doc, getDoc } from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.MENU_INTELLIGENCE;

/**
 * Convert Firestore Timestamps to JS Dates in intelligence state
 */
function convertTimestamps(data: any): MenuIntelligenceState {
    const result = { ...data };

    // Convert top-level timestamps
    if (result.computedAt?.toDate) {
        result.computedAt = result.computedAt.toDate();
    }
    if (result.validUntil?.toDate) {
        result.validUntil = result.validUntil.toDate();
    }

    // Convert itemConfidence timestamps
    if (result.itemConfidence) {
        for (const itemId of Object.keys(result.itemConfidence)) {
            if (result.itemConfidence[itemId].lastUpdated?.toDate) {
                result.itemConfidence[itemId].lastUpdated =
                    result.itemConfidence[itemId].lastUpdated.toDate();
            }
        }
    }

    // Convert suppressionWindows timestamps
    if (result.suppressionWindows) {
        for (const itemId of Object.keys(result.suppressionWindows)) {
            if (result.suppressionWindows[itemId].suppressedAt?.toDate) {
                result.suppressionWindows[itemId].suppressedAt =
                    result.suppressionWindows[itemId].suppressedAt.toDate();
            }
            if (result.suppressionWindows[itemId].suppressUntil?.toDate) {
                result.suppressionWindows[itemId].suppressUntil =
                    result.suppressionWindows[itemId].suppressUntil.toDate();
            }
        }
    }

    // Convert projectCalibration timestamp
    if (result.projectCalibration?.lockedAt?.toDate) {
        result.projectCalibration.lockedAt = result.projectCalibration.lockedAt.toDate();
    }

    // Convert audit log timestamps
    if (result.recentAuditLog) {
        result.recentAuditLog = result.recentAuditLog.map((entry: any) => ({
            ...entry,
            timestamp: entry.timestamp?.toDate ? entry.timestamp.toDate() : entry.timestamp,
            reversedAt: entry.reversedAt?.toDate ? entry.reversedAt.toDate() : entry.reversedAt
        }));
    }

    return result as MenuIntelligenceState;
}

/**
 * Get document reference for menu intelligence
 */
function getDocRef(tId: string | number, sId: string | number, projectId: string) {
    const docId = `${tId}_${sId}_${projectId}`;
    return doc(firebaseClient, COLLECTION, docId);
}

/**
 * Fetch Menu Intelligence state for a project
 * 
 * @param tId Tenant ID
 * @param sId Store ID
 * @param projectId Project ID
 * @returns Intelligence state or null if not computed yet
 */
export async function getMenuIntelligence(
    tId: string | number,
    sId: string | number,
    projectId: string
): Promise<MenuIntelligenceState | null> {
    if (!FEATURE_FLAGS.ENABLE_CONTINUOUS_MENU_INTELLIGENCE) return null;
    return await apiCallComposer(
        async () => {
            const docRef = getDocRef(tId, sId, projectId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return null;
            }

            const data = docSnap.data();
            return convertTimestamps(data);
        },
        'getMenuIntelligence'
    );
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
    return result.sort((a, b) => b.priority - a.priority);
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
