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
import {
    normalizeOwnerControlDocumentIdPart,
    parseOwnerControlUsageDocument,
    type OwnerControlType,
} from '@data/shared/ownerControlUsageContract';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { writeOwnerControlUsageEvent } from '@lib/ownerControlUsage/writeOwnerControlUsage';
import { secureError } from '@lib/security/secureLogger';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { getBoundedErrorCode, getBoundedErrorName } from '@lib/monitoring/boundedLogContext';

// ================================================================
// COST OPTIMIZATION: Debounce tracking to reduce writes
// ================================================================
const DEBOUNCE_MS = 5000; // 5 second debounce per control type
const pendingWrites: Map<string, NodeJS.Timeout> = new Map();

export interface OwnerControlMetadata {
    previousValue?: unknown;
    newValue?: unknown;
    projectId?: string;
    itemId?: string;
}

const pendingData: Map<string, { controlType: OwnerControlType; metadata?: OwnerControlMetadata }> = new Map();

const getOwnerControlErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getOwnerControlErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getOwnerControlMetadataContext = (metadata?: OwnerControlMetadata) => {
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

const COLLECTION = DB_COLLECTIONS.OWNER_CONTROL_USAGE;

export type { OwnerControlType } from '@data/shared/ownerControlUsageContract';

/**
 * Usage event structure
 */
export interface OwnerControlEvent {
    controlType: OwnerControlType;
    previousValue?: unknown;
    newValue?: unknown;
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
    counts: Partial<Record<OwnerControlType, number>>;

    // Last usage timestamps by control type
    lastUsed: Partial<Record<OwnerControlType, Date | null>>;

    // Monthly breakdown for trend analysis
    monthlyUsage: {
        [yearMonth: string]: Partial<Record<OwnerControlType, number>>;
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
    const tenantDocumentId = normalizeOwnerControlDocumentIdPart(tId);
    const storeDocumentId = normalizeOwnerControlDocumentIdPart(sId);
    if (!tenantDocumentId || !storeDocumentId) {
        throw new Error('owner_control_usage_invalid_store_scope');
    }
    const docId = `${tenantDocumentId}_${storeDocumentId}`;
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
    metadata?: OwnerControlMetadata,
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
                void executeTrackingWrite(session.tId!, session.sId!, data.controlType, data.metadata);
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
    metadata?: OwnerControlMetadata,
): Promise<void> {
    try {
        await writeOwnerControlUsageEvent(firebaseClient, tId, sId, controlType);

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
            const parsed = parseOwnerControlUsageDocument(
                data,
                docSnap.id,
                (value): value is Timestamp => value instanceof Timestamp,
                (value) => value.toMillis(),
            );
            if (!parsed) {
                logOwnerControlUsageFailure(
                    'owner_control_usage_read_invalid_document',
                    new Error('Invalid owner control usage document'),
                    undefined,
                    {
                        documentIdLength: docSnap.id.length,
                    },
                );
                return null;
            }

            // Convert Timestamps to Dates
            const lastUsed: Partial<Record<OwnerControlType, Date | null>> = {};
            for (const key of Object.keys(parsed.lastUsed) as OwnerControlType[]) {
                lastUsed[key] = parsed.lastUsed[key]?.toDate() ?? null;
            }

            return {
                tId: parsed.tId,
                sId: parsed.sId,
                counts: parsed.counts,
                lastUsed,
                monthlyUsage: parsed.monthlyUsage,
                firstTrackedAt: parsed.firstTrackedAt.toDate(),
                lastUpdatedAt: parsed.lastUpdatedAt.toDate(),
            };
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
    byControl: Partial<Record<OwnerControlType, number>>;
    trend: 'increasing' | 'stable' | 'decreasing';
} {
    const totalCounts = Object.values(stats.counts).reduce((a, b) => a + b, 0);
    const daysSinceFirst = Math.max(1,
        Math.floor((new Date().getTime() - stats.firstTrackedAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    const overallRate = totalCounts / daysSinceFirst;

    const byControl: Partial<Record<OwnerControlType, number>> = {};
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
