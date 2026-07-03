/**
 * OWNER CONTROL USAGE TRACKING - DATA ACCESS LAYER
 * ═══════════════════════════════════════════════════════════════
 * 
 * Tracks usage of owner controls for Authority Maturation Doctrine.
 * Used to measure Phase 1 → Phase 2 → Phase 3 progression.
 * 
 * Controls tracked:
 * - ownerBoost: Item boost/demote slider (-20 to +20)
 * - decisionBlockSettings: Enable/disable blocks, pin items
 * - screenOverride: Owner upload prioritization toggle
 * 
 * Per Authority Maturation Doctrine:
 * - Usage = Lack of Trust Signal
 * - Declining usage = Maturation progressing
 * - High usage → system trust hasn't formed
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import getActiveSession from '@lib/auth/getActiveSession';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { secureError } from '@lib/security/secureLogger';
import { doc, getDoc, increment, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

// ================================================================
// COST OPTIMIZATION: Debounce tracking to reduce writes
// ================================================================
const DEBOUNCE_MS = 5000; // 5 second debounce per control type
const pendingWrites: Map<string, NodeJS.Timeout> = new Map();
const pendingData: Map<string, { controlType: OwnerControlType; metadata?: any }> = new Map();

const getOwnerControlErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getOwnerControlErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getOwnerControlMetadataContext = (metadata?: {
    previousValue?: any;
    newValue?: any;
    projectId?: string;
    itemId?: string;
}) => {
    const projectId = String(metadata?.projectId ?? '');
    const itemId = String(metadata?.itemId ?? '');

    return {
        metadataPresent: Boolean(metadata),
        hasPreviousValue: metadata?.previousValue !== undefined,
        hasNewValue: metadata?.newValue !== undefined,
        projectIdPresent: projectId.length > 0,
        projectIdLength: projectId.length,
        itemIdPresent: itemId.length > 0,
        itemIdLength: itemId.length,
    };
};

const logOwnerControlUsageFailure = (
    failureCode: string,
    error: unknown,
    controlType?: OwnerControlType,
    context: Record<string, boolean | number | string | null | undefined> = {},
): void => {
    secureError('[OwnerControlUsage] Tracking failed', new Error(failureCode), {
        controlType,
        ...context,
        sourceErrorName: getOwnerControlErrorName(error),
        sourceErrorCode: getOwnerControlErrorCode(error),
    });
};

/**
 * Sanitize object for Firestore (replace undefined with null)
 */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
    const result = {} as T;
    for (const key in obj) {
        const value = obj[key];
        if (value === undefined) {
            (result as any)[key] = null;
        } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value as any).toDate) {
            // Skip Firestore Timestamps (they have toDate method)
            (result as any)[key] = sanitizeForFirestore(value as Record<string, any>);
        } else if (Array.isArray(value)) {
            (result as any)[key] = value.map(item =>
                (item && typeof item === 'object') ? sanitizeForFirestore(item) : item
            );
        } else {
            (result as any)[key] = value;
        }
    }
    return result;
}

const COLLECTION = DB_COLLECTIONS.OWNER_CONTROL_USAGE;

/**
 * Owner Control Types
 */
export type OwnerControlType =
    | 'ownerBoost'           // Item boost slider changed
    | 'pinnedPopular'        // Pinned item for Popular block
    | 'pinnedQuickPick'      // Pinned item for Quick Pick block
    | 'pinnedBestValue'      // Pinned item for Best Value block
    | 'enablePopular'        // Toggle Popular block on/off
    | 'enableQuickPick'      // Toggle Quick Pick block on/off
    | 'enableBestValue'      // Toggle Best Value block on/off
    | 'screenOverride';      // Owner upload prioritization toggle

/**
 * Usage event structure
 */
export interface OwnerControlEvent {
    controlType: OwnerControlType;
    previousValue?: any;
    newValue?: any;
    projectId?: string;
    itemId?: string;
    timestamp: Date;
}

/**
 * Aggregated usage stats for a store
 */
export interface OwnerControlUsageStats {
    tId: string;
    sId: string;

    // Total counts by control type
    counts: Record<OwnerControlType, number>;

    // Last usage timestamps by control type
    lastUsed: Record<OwnerControlType, Date | null>;

    // Monthly breakdown for trend analysis
    monthlyUsage: {
        [yearMonth: string]: Record<OwnerControlType, number>;
    };

    // First tracked and last updated
    firstTrackedAt: Date;
    lastUpdatedAt: Date;
}

/**
 * Get document reference for usage stats
 * Per tenant/store - not per project (tracks overall owner behavior)
 */
function getDocRef(tId: string | number, sId: string | number) {
    const docId = `${tId}_${sId}`;
    return doc(firebaseClient, COLLECTION, docId);
}

/**
 * Track an owner control usage event
 * 
 * COST OPTIMIZATIONS:
 * - Feature flag gated (ENABLE_OWNER_ANALYTICS)
 * - Debounced writes (5s per control type)
 * - Fire-and-forget (non-blocking)
 * - Errors logged but not thrown
 */
export async function trackOwnerControlUsage(
    controlType: OwnerControlType,
    metadata?: {
        previousValue?: any;
        newValue?: any;
        projectId?: string;
        itemId?: string;
    }
): Promise<void> {
    // COST GATE: Check feature flag first (zero cost if disabled)
    if (!FEATURE_FLAGS.ENABLE_OWNER_ANALYTICS) {
        return; // Silent return - no logging to avoid console spam
    }

    try {
        const session = await getActiveSession();
        if (!session?.tId || !session?.sId) {
            return; // Silent return - no session
        }

        // COST OPTIMIZATION: Debounce writes per control type
        const debounceKey = `${session.tId}_${session.sId}_${controlType}`;

        // Clear existing timer if any
        if (pendingWrites.has(debounceKey)) {
            clearTimeout(pendingWrites.get(debounceKey)!);
        }

        // Store pending data
        pendingData.set(debounceKey, { controlType, metadata });

        // Set new debounced write
        const timer = setTimeout(() => {
            const data = pendingData.get(debounceKey);
            if (data) {
                executeTrackingWrite(session.tId!, session.sId!, data.controlType, data.metadata);
                pendingData.delete(debounceKey);
            }
            pendingWrites.delete(debounceKey);
        }, DEBOUNCE_MS);

        pendingWrites.set(debounceKey, timer);
    } catch (error) {
        // Fire-and-forget - silent fail
        logOwnerControlUsageFailure('owner_control_tracking_schedule_failed', error, controlType, {
            ...getOwnerControlMetadataContext(metadata),
        });
    }
}

/**
 * Execute the actual Firestore write (called after debounce)
 */
async function executeTrackingWrite(
    tId: string | number,
    sId: string | number,
    controlType: OwnerControlType,
    metadata?: any
): Promise<void> {
    try {
        const tIdStr = String(tId);
        const sIdStr = String(sId);
        const docRef = getDocRef(tIdStr, sIdStr);
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        try {
            await updateDoc(docRef, {
                [`counts.${controlType}`]: increment(1),
                [`lastUsed.${controlType}`]: Timestamp.fromDate(now),
                [`monthlyUsage.${yearMonth}.${controlType}`]: increment(1),
                lastUpdatedAt: Timestamp.fromDate(now),
            });
        } catch (error: any) {
            if (error?.code !== 'not-found') {
                throw error;
            }

            const initialData: any = {
                tId,
                sId,
                counts: { [controlType]: 1 },
                lastUsed: { [controlType]: Timestamp.fromDate(now) },
                monthlyUsage: {
                    [yearMonth]: { [controlType]: 1 },
                },
                firstTrackedAt: Timestamp.fromDate(now),
                lastUpdatedAt: Timestamp.fromDate(now),
            };

            await setDoc(docRef, sanitizeForFirestore(initialData));
        }

    } catch (error) {
        // Fire-and-forget - log but don't throw
        logOwnerControlUsageFailure('owner_control_tracking_write_failed', error, controlType, {
            tIdPresent: String(tId ?? '').length > 0,
            tIdLength: String(tId ?? '').length,
            sIdPresent: String(sId ?? '').length > 0,
            sIdLength: String(sId ?? '').length,
            ...getOwnerControlMetadataContext(metadata),
        });
    }
}

/**
 * Get owner control usage stats for a store
 */
export async function getOwnerControlUsageStats(
    tId: string | number,
    sId: string | number
): Promise<OwnerControlUsageStats | null> {
    return await apiCallComposer(
        async () => {
            const docRef = getDocRef(tId, sId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return null;
            }

            const data = docSnap.data();

            // Convert Timestamps to Dates
            const lastUsed: Record<OwnerControlType, Date | null> = {} as any;
            if (data.lastUsed) {
                for (const key of Object.keys(data.lastUsed)) {
                    lastUsed[key as OwnerControlType] = data.lastUsed[key]?.toDate?.() || null;
                }
            }

            return {
                tId: data.tId,
                sId: data.sId,
                counts: data.counts || {},
                lastUsed,
                monthlyUsage: data.monthlyUsage || {},
                firstTrackedAt: data.firstTrackedAt?.toDate?.() || new Date(),
                lastUpdatedAt: data.lastUpdatedAt?.toDate?.() || new Date(),
            } as OwnerControlUsageStats;
        },
        'getOwnerControlUsageStats'
    );
}

/**
 * Calculate usage percentage for maturation analysis
 * Returns percentage of days with control usage vs total tracked days
 */
export function calculateUsageRate(stats: OwnerControlUsageStats): {
    overallRate: number;
    byControl: Record<OwnerControlType, number>;
    trend: 'increasing' | 'stable' | 'decreasing';
} {
    const totalCounts = Object.values(stats.counts).reduce((a, b) => a + b, 0);
    const daysSinceFirst = Math.max(1,
        Math.floor((new Date().getTime() - stats.firstTrackedAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    const overallRate = totalCounts / daysSinceFirst;

    const byControl: Record<OwnerControlType, number> = {} as any;
    for (const [key, count] of Object.entries(stats.counts)) {
        byControl[key as OwnerControlType] = count / daysSinceFirst;
    }

    // Calculate trend from monthly data
    const months = Object.keys(stats.monthlyUsage).sort();
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';

    if (months.length >= 2) {
        const lastMonth = stats.monthlyUsage[months[months.length - 1]];
        const prevMonth = stats.monthlyUsage[months[months.length - 2]];

        const lastTotal = Object.values(lastMonth || {}).reduce((a: number, b: number) => a + b, 0);
        const prevTotal = Object.values(prevMonth || {}).reduce((a: number, b: number) => a + b, 0);

        if (lastTotal > prevTotal * 1.2) trend = 'increasing';
        else if (lastTotal < prevTotal * 0.8) trend = 'decreasing';
    }

    return { overallRate, byControl, trend };
}
