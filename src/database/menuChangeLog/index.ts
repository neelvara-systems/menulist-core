/**
 * MENU CHANGE LOG - DATA ACCESS LAYER
 * ═══════════════════════════════════════════════════════════════
 * 
 * Menu Observation Layer (MOL v0) - Silent infrastructure for tracking
 * all menu changes. NO UI, NO owner visibility.
 * 
 * Implements:
 * - Category D (Owner Intervention Tracking) from Internal Tracking System
 * - Immutable, append-only change log
 * - Debounced writes for cost optimization
 * 
 * Per Authority Maturation Doctrine:
 * - Changes are memory, not audit
 * - System learns patterns, never exposes them
 * - Foundation for future autonomous capabilities
 * 
 * @see __docs__/internal-tracking/mol-v0-implementation-plan.md
 * @see __docs__/internal-tracking/menulist-internal-tracking-system.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import getActiveSession from '@lib/auth/getActiveSession';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import {
    ChangeActor,
    ChangeLogDebounceKey,
    MenuChangeLogEntry,
    MenuChangeLogInput,
    MenuChangeType,
    PendingMenuChange,
} from '@type/menuObservation';
import {
    addDoc,
    collection,
    getDocs,
    limit,
    orderBy,
    query,
    QueryConstraint,
    startAfter,
    Timestamp,
    where,
} from 'firebase/firestore';
import {
    getBoundedMenuChangeLogStringContext,
    getMenuChangeLogEntryContext,
    logMenuChangeLogFailure,
} from './menuChangeLogDiagnostics';

// ================================================================
// COST OPTIMIZATION: Debounce tracking to reduce writes
// Same pattern as ownerControlUsage
// ================================================================
const DEBOUNCE_MS = FEATURE_FLAGS.MENU_OBSERVATION_DEBOUNCE_MS || 5000;
const pendingWrites: Map<ChangeLogDebounceKey, NodeJS.Timeout> = new Map();
const pendingData: Map<ChangeLogDebounceKey, PendingMenuChange> = new Map();

const COLLECTION = DB_COLLECTIONS.MENU_CHANGE_LOG;
type MenuChangeScope = { tId: string | number; sId: string | number };

/**
 * Sanitize object for Firestore (replace undefined with null)
 * Required per Security Rule #16
 */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
    const result = {} as T;
    for (const key in obj) {
        const value = obj[key];
        if (value === undefined) {
            (result as any)[key] = null;
        } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value as any).toDate) {
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

/**
 * Get collection reference for change logs
 * Path: menuChangeLog/{tId}/{sId}
 */
async function getCollectionRef(session?: any) {
    session = session || await getActiveSession();
    if (!session?.tId || !session?.sId) {
        throw new Error('No active session');
    }
    return collection(
        firebaseClient,
        `${COLLECTION}/${session.tId}/${session.sId}`
    );
}

/**
 * Generate debounce key for a change
 * Format: {tId}_{sId}_{projectId}_{itemId}_{changeType}
 */
function getDebounceKey(
    tId: string | number,
    sId: string | number,
    projectId: string,
    itemId: string | undefined,
    changeType: MenuChangeType
): ChangeLogDebounceKey {
    return `${tId}_${sId}_${projectId}_${itemId || 'category'}_${changeType}`;
}

/**
 * Log a menu change
 * 
 * COST OPTIMIZATIONS:
 * - Feature flag gated (ENABLE_MENU_OBSERVATION)
 * - Debounced writes (5s per item per change type)
 * - Fire-and-forget (non-blocking)
 * - Errors logged but not thrown
 * 
 * @param entry - Change log entry (without auto-generated fields)
 */
export async function logMenuChange(entry: MenuChangeLogInput): Promise<void> {
    // COST GATE: Check feature flag first (zero cost if disabled)
    if (!FEATURE_FLAGS.ENABLE_MENU_OBSERVATION) {
        return; // Silent return - no logging to avoid console spam
    }

    try {
        const session = await getActiveSession();
        if (!session?.tId || !session?.sId) {
            return; // Silent return - no session
        }

        await queueScopedMenuChange(entry, session);
    } catch (error) {
        // Fire-and-forget - log bounded diagnostics without blocking owner work.
        logMenuChangeLogFailure('menu_change_log_tracking_failed', error, getMenuChangeLogEntryContext(entry));
    }
}

export async function logMenuChangeForScope(
    entry: MenuChangeLogInput,
    scope: MenuChangeScope,
): Promise<void> {
    if (!FEATURE_FLAGS.ENABLE_MENU_OBSERVATION) {
        return;
    }

    if (!scope?.tId || !scope?.sId) {
        return;
    }

    try {
        await queueScopedMenuChange(entry, scope);
    } catch (error) {
        logMenuChangeLogFailure('menu_change_log_scoped_tracking_failed', error, {
            ...getMenuChangeLogEntryContext(entry),
            ...getBoundedMenuChangeLogStringContext('tenantId', scope.tId),
            ...getBoundedMenuChangeLogStringContext('storeId', scope.sId),
        });
    }
}

async function queueScopedMenuChange(
    entry: MenuChangeLogInput,
    scope: MenuChangeScope,
): Promise<void> {
        // COST OPTIMIZATION: Debounce writes per item per change type
        const debounceKey = getDebounceKey(
            scope.tId,
            scope.sId,
            entry.projectId,
            entry.itemId,
            entry.changeType
        );

        // Clear existing timer if any
        if (pendingWrites.has(debounceKey)) {
            clearTimeout(pendingWrites.get(debounceKey)!);
        }

        // Store pending data (latest value wins)
        pendingData.set(debounceKey, {
            entry,
            debounceKey,
            queuedAt: Date.now(),
        });

        // Set new debounced write
        const timer = setTimeout(() => {
            const pending = pendingData.get(debounceKey);
            if (pending) {
                void executeLogWrite(scope.tId, scope.sId, pending.entry);
                pendingData.delete(debounceKey);
            }
            pendingWrites.delete(debounceKey);
        }, DEBOUNCE_MS);

        pendingWrites.set(debounceKey, timer);
}

/**
 * Execute the actual Firestore write (called after debounce)
 */
async function executeLogWrite(
    tId: string | number,
    sId: string | number,
    entry: MenuChangeLogInput
): Promise<void> {
    try {
        const session = { tId, sId };
        const collectionRef = await getCollectionRef(session);

        const logEntry: Omit<MenuChangeLogEntry, 'id'> = {
            ...entry,
            tId: Number(tId),
            sId: Number(sId),
            timestamp: Timestamp.now(),
        };

        await addDoc(collectionRef, sanitizeForFirestore(logEntry));
    } catch (error) {
        // Fire-and-forget - log but don't throw
        logMenuChangeLogFailure('menu_change_log_write_failed', error, {
            ...getMenuChangeLogEntryContext(entry),
            ...getBoundedMenuChangeLogStringContext('tenantId', tId),
            ...getBoundedMenuChangeLogStringContext('storeId', sId),
        });
    }
}

/**
 * Log multiple changes at once (for batch operations)
 * Each change is still debounced individually
 */
export async function logMenuChanges(entries: MenuChangeLogInput[]): Promise<void> {
    for (const entry of entries) {
        await logMenuChange(entry);
    }
}

/**
 * Flush all pending writes immediately
 * Useful for testing or before page unload
 */
export function flushPendingChanges(): void {
    Array.from(pendingWrites.entries()).forEach(([key, timer]) => {
        clearTimeout(timer);
        const pending = pendingData.get(key);
        if (pending) {
            // Fire without waiting
            void getActiveSession().then(session => {
                if (session?.tId && session?.sId) {
                    void executeLogWrite(session.tId, session.sId, pending.entry);
                }
            }).catch((error) => {
                logMenuChangeLogFailure('menu_change_log_flush_session_failed', error, {
                    ...getMenuChangeLogEntryContext(pending.entry),
                });
            });
        }
    });
    pendingWrites.clear();
    pendingData.clear();
}

// ================================================================
// QUERY FUNCTIONS (For nightly Cloud Function use only)
// These are NOT for UI - internal system use only
// ================================================================

export interface ChangeLogQueryOptions {
    itemId?: string;
    categoryId?: string;
    changeType?: MenuChangeType;
    limit?: number;
    startAfterTimestamp?: Timestamp;
}

/**
 * Get change history for a project
 * 
 * NOTE: This is for internal system use only (Cloud Functions)
 * NOT for UI display - per MOL v0 doctrine
 */
export async function getChangeHistory(
    projectId: string,
    options: ChangeLogQueryOptions = {}
): Promise<MenuChangeLogEntry[]> {
    return await apiCallComposer(
        async () => {
            const collectionRef = await getCollectionRef();

            const constraints: QueryConstraint[] = [
                where('projectId', '==', projectId),
                orderBy('timestamp', 'desc'),
            ];

            if (options.itemId) {
                constraints.push(where('itemId', '==', options.itemId));
            }

            if (options.categoryId) {
                constraints.push(where('categoryId', '==', options.categoryId));
            }

            if (options.changeType) {
                constraints.push(where('changeType', '==', options.changeType));
            }

            if (options.limit) {
                constraints.push(limit(options.limit));
            }

            if (options.startAfterTimestamp) {
                constraints.push(startAfter(options.startAfterTimestamp));
            }

            const q = query(collectionRef, ...constraints);
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as MenuChangeLogEntry[];
        },
        'getChangeHistory'
    );
}

/**
 * Get change count for an item since a specific date
 * Used by nightly drift metrics computation
 */
export async function getChangeCountSince(
    projectId: string,
    itemId: string,
    changeType: MenuChangeType,
    since: Date
): Promise<number> {
    return await apiCallComposer(
        async () => {
            const collectionRef = await getCollectionRef();

            const q = query(
                collectionRef,
                where('projectId', '==', projectId),
                where('itemId', '==', itemId),
                where('changeType', '==', changeType),
                where('timestamp', '>=', Timestamp.fromDate(since))
            );

            const snapshot = await getDocs(q);
            return snapshot.size;
        },
        'getChangeCountSince'
    );
}

/**
 * Get all changes in a date range for drift analysis
 * Used by nightly Cloud Function
 */
export async function getChangesInRange(
    projectId: string,
    startDate: Date,
    endDate: Date
): Promise<MenuChangeLogEntry[]> {
    return await apiCallComposer(
        async () => {
            const collectionRef = await getCollectionRef();

            const q = query(
                collectionRef,
                where('projectId', '==', projectId),
                where('timestamp', '>=', Timestamp.fromDate(startDate)),
                where('timestamp', '<=', Timestamp.fromDate(endDate)),
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as MenuChangeLogEntry[];
        },
        'getChangesInRange'
    );
}

// ================================================================
// HELPER FUNCTIONS FOR CHANGE DETECTION
// ================================================================

/**
 * Helper to create a price change entry
 */
export function createPriceChangeEntry(
    projectId: string,
    itemId: string,
    oldPrice: string | undefined,
    newPrice: string | undefined,
    actor: ChangeActor = 'OWNER',
    userId?: string
): MenuChangeLogInput {
    return {
        projectId,
        itemId,
        changeType: 'PRICE',
        oldValue: oldPrice ?? null,
        newValue: newPrice ?? null,
        changedBy: actor,
        userId,
    };
}

/**
 * Helper to create an availability change entry
 */
export function createAvailabilityChangeEntry(
    projectId: string,
    itemId: string,
    oldAvailable: boolean | undefined,
    newAvailable: boolean | undefined,
    actor: ChangeActor = 'OWNER',
    userId?: string
): MenuChangeLogInput {
    return {
        projectId,
        itemId,
        changeType: 'AVAILABILITY',
        oldValue: oldAvailable ?? true, // Default true per schema
        newValue: newAvailable ?? true,
        changedBy: actor,
        userId,
    };
}

/**
 * Helper to create an item active change entry
 */
export function createActiveChangeEntry(
    projectId: string,
    itemId: string,
    oldActive: boolean,
    newActive: boolean,
    actor: ChangeActor = 'OWNER',
    userId?: string
): MenuChangeLogInput {
    return {
        projectId,
        itemId,
        changeType: 'ITEM_ACTIVE',
        oldValue: oldActive,
        newValue: newActive,
        changedBy: actor,
        userId,
    };
}

/**
 * Helper to create an item added entry
 */
export function createItemAddedEntry(
    projectId: string,
    itemId: string,
    itemData: any,
    actor: ChangeActor = 'OWNER',
    userId?: string
): MenuChangeLogInput {
    return {
        projectId,
        itemId,
        changeType: 'ITEM_ADDED',
        oldValue: null,
        newValue: {
            name: itemData.name,
            price: itemData.price,
            category: itemData.category,
        },
        changedBy: actor,
        userId,
    };
}

/**
 * Helper to create an extraction correction entry (Infrastructure Compounding 10.2)
 * Logged when owner edits an item that was recently AI-extracted.
 * Tracks which field was corrected and the original AI value vs owner correction.
 */
export function createExtractionCorrectionEntry(
    projectId: string,
    itemId: string,
    field: 'name' | 'price' | 'description' | 'categoryId' | 'tags',
    extractedValue: any,
    correctedValue: any,
    confidence?: 'high' | 'medium' | 'low',
    actor: ChangeActor = 'OWNER',
    userId?: string
): MenuChangeLogInput {
    return {
        projectId,
        itemId,
        changeType: 'EXTRACTION_CORRECTION',
        oldValue: { field, extracted: extractedValue, confidence: confidence ?? null },
        newValue: { field, corrected: correctedValue },
        changedBy: actor,
        userId,
    };
}

export function createMenuRevisionSummaryEntry(
    projectId: string,
    summary: Record<string, any>,
    actor: ChangeActor = 'OWNER',
    userId?: string,
    metadata?: Record<string, any>,
): MenuChangeLogInput {
    return {
        projectId,
        changeType: 'MENU_REVISION_SUMMARY',
        oldValue: null,
        newValue: summary,
        changedBy: actor,
        userId,
        metadata: {
            mode: 'summary',
            ...metadata,
        },
    };
}

/**
 * Helper to create an item removed entry
 */
export function createItemRemovedEntry(
    projectId: string,
    itemId: string,
    itemData: any,
    actor: ChangeActor = 'OWNER',
    userId?: string
): MenuChangeLogInput {
    return {
        projectId,
        itemId,
        changeType: 'ITEM_REMOVED',
        oldValue: {
            name: itemData.name,
            price: itemData.price,
            category: itemData.category,
        },
        newValue: null,
        changedBy: actor,
        userId,
    };
}
