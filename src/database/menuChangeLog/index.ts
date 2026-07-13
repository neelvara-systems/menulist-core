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
import { replaceUndefined } from '@lib/apiHelper';
import getActiveSession from '@lib/auth/getActiveSession';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';
import {
    ChangeActor,
    ChangeLogDebounceKey,
    MENU_CHANGE_ACTORS,
    MENU_CHANGE_TYPES,
    MenuChangeLogEntry,
    MenuChangeLogInput,
    MenuChangeScope,
    MenuChangeType,
    PendingMenuChange,
} from '@type/menuObservation';
import {
    addDoc,
    collection,
    documentId,
    getDocs,
    limit as firestoreLimit,
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
    logMenuChangeLogDiagnostic,
    logMenuChangeLogFailure,
} from './menuChangeLogDiagnostics';
import {
    createMenuChangeLogPendingKey,
    createPendingMenuChange,
    normalizeMenuChangeLogIdentifier,
    normalizeMenuChangeLogQueryLimit,
    normalizeMenuChangeLogScope,
    shouldDebounceMenuChange,
    takePendingMenuChanges,
} from './menuChangeLogBoundary';

// ================================================================
// COST OPTIMIZATION: Debounce tracking to reduce writes
// Same pattern as ownerControlUsage
// ================================================================
const DEBOUNCE_MS = FEATURE_FLAGS.MENU_OBSERVATION_DEBOUNCE_MS || 5000;
const pendingWrites: Map<ChangeLogDebounceKey, ReturnType<typeof setTimeout>> = new Map();
const pendingData: Map<ChangeLogDebounceKey, PendingMenuChange> = new Map();
let appendOnlyQueueSequence = 0;

const COLLECTION = DB_COLLECTIONS.MENU_CHANGE_LOG;
type MenuChangeScopeInput = { tId: string | number; sId: string | number };

const isRecord = (value: unknown): value is Record<string, unknown> => (
    value !== null && typeof value === 'object' && !Array.isArray(value)
);

const isMenuChangeType = (value: unknown): value is MenuChangeType => (
    typeof value === 'string' && MENU_CHANGE_TYPES.some(changeType => changeType === value)
);

const isChangeActor = (value: unknown): value is ChangeActor => (
    typeof value === 'string' && MENU_CHANGE_ACTORS.some(actor => actor === value)
);

/**
 * Get collection reference for change logs
 * Path: menuChangeLog/{tId}/{sId}
 */
function getCollectionRef(scope: MenuChangeScope) {
    return collection(
        firebaseClient,
        `${COLLECTION}/${scope.tId}/${scope.sId}`
    );
}

async function getActiveMenuChangeScope(): Promise<MenuChangeScope> {
    const scope = normalizeMenuChangeLogScope(await getActiveSession());
    if (!scope) throw new Error('No valid active menu change log scope');
    return scope;
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
        return;
    }

    try {
        const scope = normalizeMenuChangeLogScope(await getActiveSession());
        if (!scope) {
            logMenuChangeLogDiagnostic('menu_change_log_session_missing', getMenuChangeLogEntryContext(entry));
            return;
        }

        queueScopedMenuChange(entry, scope);
    } catch (error) {
        // Fire-and-forget - log bounded diagnostics without blocking owner work.
        logMenuChangeLogFailure('menu_change_log_tracking_failed', error, getMenuChangeLogEntryContext(entry));
    }
}

export async function logMenuChangeForScope(
    entry: MenuChangeLogInput,
    scope: MenuChangeScopeInput,
): Promise<void> {
    if (!FEATURE_FLAGS.ENABLE_MENU_OBSERVATION) {
        return;
    }

    const normalizedScope = normalizeMenuChangeLogScope(scope);
    if (!normalizedScope) {
        logMenuChangeLogDiagnostic('menu_change_log_scope_invalid', {
            ...getMenuChangeLogEntryContext(entry),
            ...getBoundedMenuChangeLogStringContext('tenantId', scope?.tId),
            ...getBoundedMenuChangeLogStringContext('storeId', scope?.sId),
        });
        return;
    }

    try {
        queueScopedMenuChange(entry, normalizedScope);
    } catch (error) {
        logMenuChangeLogFailure('menu_change_log_scoped_tracking_failed', error, {
            ...getMenuChangeLogEntryContext(entry),
            ...getBoundedMenuChangeLogStringContext('tenantId', scope.tId),
            ...getBoundedMenuChangeLogStringContext('storeId', scope.sId),
        });
    }
}

function queueScopedMenuChange(
    entry: MenuChangeLogInput,
    scope: MenuChangeScope,
): void {
    const entrySnapshot = sanitizeForFirestore(entry, {
        undefinedObjectValue: 'omit',
    });
    if (!isMenuChangeType(entrySnapshot.changeType)
        || !isChangeActor(entrySnapshot.changedBy)
        || !Object.prototype.hasOwnProperty.call(entrySnapshot, 'oldValue')
        || !Object.prototype.hasOwnProperty.call(entrySnapshot, 'newValue')) {
        throw new TypeError('Invalid menu change log entry');
    }
    normalizeMenuChangeLogIdentifier(entrySnapshot.projectId, 'projectId');
    if (entrySnapshot.itemId !== undefined) {
        normalizeMenuChangeLogIdentifier(entrySnapshot.itemId, 'itemId');
    }
    if (entrySnapshot.categoryId !== undefined) {
        normalizeMenuChangeLogIdentifier(entrySnapshot.categoryId, 'categoryId');
    }
    if (entrySnapshot.userId !== undefined) {
        normalizeMenuChangeLogIdentifier(entrySnapshot.userId, 'userId');
    }
    if (entrySnapshot.metadata !== undefined && !isRecord(entrySnapshot.metadata)) {
        throw new TypeError('Invalid menu change log metadata');
    }

    // Completed revision/publish operations receive unique queue keys so they
    // remain flushable but never replace one another. Detailed state changes
    // retain stable keys and the existing cost-control debounce.
    if (!shouldDebounceMenuChange(entrySnapshot.changeType)) {
        appendOnlyQueueSequence = appendOnlyQueueSequence === Number.MAX_SAFE_INTEGER
            ? 1
            : appendOnlyQueueSequence + 1;
    }
    const debounceKey = createMenuChangeLogPendingKey(
        scope,
        entrySnapshot,
        appendOnlyQueueSequence || 1,
    );
    const existingTimer = pendingWrites.get(debounceKey);
    if (existingTimer) clearTimeout(existingTimer);

    // Snapshot both payload and scope so later object/session mutations cannot
    // retarget or alter the queued immutable event.
    pendingData.set(
        debounceKey,
        createPendingMenuChange(entrySnapshot, scope, debounceKey),
    );

    const timer = setTimeout(() => {
        const pending = pendingData.get(debounceKey);
        pendingData.delete(debounceKey);
        pendingWrites.delete(debounceKey);
        if (pending) void executeLogWrite(pending.scope, pending.entry);
    }, DEBOUNCE_MS);

    pendingWrites.set(debounceKey, timer);
}

/**
 * Execute the actual Firestore write (called after debounce)
 */
async function executeLogWrite(
    scope: MenuChangeScope,
    entry: MenuChangeLogInput
): Promise<void> {
    try {
        const collectionRef = getCollectionRef(scope);

        const logEntry: Omit<MenuChangeLogEntry, 'id'> = {
            ...entry,
            tId: scope.tId,
            sId: scope.sId,
            timestamp: Timestamp.now(),
        };

        await addDoc(collectionRef, replaceUndefined(logEntry));
    } catch (error) {
        // Fire-and-forget - log but don't throw
        logMenuChangeLogFailure('menu_change_log_write_failed', error, {
            ...getMenuChangeLogEntryContext(entry),
            ...getBoundedMenuChangeLogStringContext('tenantId', scope.tId),
            ...getBoundedMenuChangeLogStringContext('storeId', scope.sId),
        });
    }
}

/**
 * Log multiple changes at once (for batch operations)
 * Each change is still debounced individually
 */
export async function logMenuChanges(entries: MenuChangeLogInput[]): Promise<void> {
    if (!FEATURE_FLAGS.ENABLE_MENU_OBSERVATION || entries.length === 0) return;

    let scope: MenuChangeScope;
    try {
        scope = await getActiveMenuChangeScope();
    } catch (error) {
        logMenuChangeLogFailure('menu_change_log_batch_session_failed', error, {
            entryCount: entries.length,
        });
        return;
    }

    queueMenuChangesForScope(entries, scope);
}

export async function logMenuChangesForScope(
    entries: MenuChangeLogInput[],
    scope: MenuChangeScopeInput,
): Promise<void> {
    if (!FEATURE_FLAGS.ENABLE_MENU_OBSERVATION || entries.length === 0) return;

    const normalizedScope = normalizeMenuChangeLogScope(scope);
    if (!normalizedScope) {
        logMenuChangeLogDiagnostic('menu_change_log_batch_scope_invalid', {
            entryCount: entries.length,
            ...getBoundedMenuChangeLogStringContext('tenantId', scope?.tId),
            ...getBoundedMenuChangeLogStringContext('storeId', scope?.sId),
        });
        return;
    }
    queueMenuChangesForScope(entries, normalizedScope);
}

function queueMenuChangesForScope(
    entries: MenuChangeLogInput[],
    scope: MenuChangeScope,
): void {
    for (const entry of entries) {
        try {
            queueScopedMenuChange(entry, scope);
        } catch (error) {
            logMenuChangeLogFailure('menu_change_log_batch_entry_failed', error, {
                ...getMenuChangeLogEntryContext(entry),
                ...getBoundedMenuChangeLogStringContext('tenantId', scope.tId),
                ...getBoundedMenuChangeLogStringContext('storeId', scope.sId),
            });
        }
    }
}

/**
 * Flush all pending writes immediately
 * Useful for testing or before page unload
 */
export async function flushPendingChanges(): Promise<void> {
    pendingWrites.forEach(timer => clearTimeout(timer));
    pendingWrites.clear();
    const pending = takePendingMenuChanges(pendingData);
    await Promise.all(pending.map(change => executeLogWrite(change.scope, change.entry)));
}

if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
        void flushPendingChanges();
    });
}

// ================================================================
// QUERY FUNCTIONS (internal authenticated client tooling only)
// Scheduled Functions use package-local Admin readers; these remain off owner UI.
// ================================================================

export interface ChangeLogQueryOptions {
    itemId?: string;
    categoryId?: string;
    changeType?: MenuChangeType;
    limit?: number;
    startAfterTimestamp?: Timestamp;
    startAfterId?: string;
}

const getValidTimestampCursor = (value?: Timestamp): Timestamp | undefined => {
    if (value === undefined) return undefined;
    if (!(value instanceof Timestamp) || !Number.isFinite(value.toMillis())) {
        throw new TypeError('Invalid menu change log timestamp cursor');
    }
    return value;
};

const getValidDateTimestamp = (value: Date, field: string): Timestamp => {
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
        throw new TypeError(`Invalid ${field}`);
    }
    return Timestamp.fromDate(value);
};

const normalizeStoredMenuChange = (
    id: string,
    value: unknown,
): MenuChangeLogEntry | null => {
    if (!isRecord(value)
        || typeof value.projectId !== 'string'
        || !isMenuChangeType(value.changeType)
        || !isChangeActor(value.changedBy)
        || !(value.timestamp instanceof Timestamp)
        || !('oldValue' in value)
        || !('newValue' in value)) {
        return null;
    }

    const entry: MenuChangeLogEntry = {
        id,
        projectId: value.projectId,
        changeType: value.changeType,
        oldValue: value.oldValue,
        newValue: value.newValue,
        changedBy: value.changedBy,
        timestamp: value.timestamp,
    };

    if (typeof value.itemId === 'string') entry.itemId = value.itemId;
    if (typeof value.categoryId === 'string') entry.categoryId = value.categoryId;
    if (typeof value.userId === 'string') entry.userId = value.userId;
    if (isRecord(value.metadata)) entry.metadata = value.metadata;
    const storedScope = normalizeMenuChangeLogScope({ tId: value.tId, sId: value.sId });
    if (storedScope) {
        entry.tId = storedScope.tId;
        entry.sId = storedScope.sId;
    }
    return entry;
};

const normalizeChangeSnapshot = (
    docs: ReadonlyArray<{ id: string; data: () => unknown }>,
): MenuChangeLogEntry[] => {
    const entries: MenuChangeLogEntry[] = [];
    for (const document of docs) {
        const entry = normalizeStoredMenuChange(document.id, document.data());
        if (entry) {
            entries.push(entry);
        } else {
            logMenuChangeLogDiagnostic('menu_change_log_document_invalid', {
                ...getBoundedMenuChangeLogStringContext('documentId', document.id),
            });
        }
    }
    return entries;
};

const MENU_CHANGE_LOG_SCAN_PAGE_SIZE = 100;
const MAX_MENU_CHANGE_LOG_SCAN_DOCUMENTS = 5000;

type MenuChangeLogScanOptions = Readonly<{
    scope: MenuChangeScope;
    startTimestamp?: Timestamp;
    endTimestamp?: Timestamp;
    startAfterTimestamp?: Timestamp;
    startAfterId?: string;
}>;

const visitStoredMenuChanges = async (
    options: MenuChangeLogScanOptions,
    visitor: (entry: MenuChangeLogEntry) => boolean,
): Promise<void> => {
    const hasCursorTimestamp = options.startAfterTimestamp !== undefined;
    const hasCursorId = options.startAfterId !== undefined;
    if (hasCursorTimestamp !== hasCursorId) {
        throw new TypeError('Menu change log pagination requires timestamp and document ID');
    }

    let cursorTimestamp: unknown = options.startAfterTimestamp;
    let cursorId = options.startAfterId === undefined
        ? undefined
        : normalizeMenuChangeLogIdentifier(options.startAfterId, 'startAfterId');
    const collectionRef = getCollectionRef(options.scope);
    let documentsScanned = 0;

    while (true) {
        if (documentsScanned >= MAX_MENU_CHANGE_LOG_SCAN_DOCUMENTS) {
            throw new RangeError('Menu change log scan limit exceeded');
        }
        const constraints: QueryConstraint[] = [];
        if (options.startTimestamp) {
            constraints.push(where('timestamp', '>=', options.startTimestamp));
        }
        if (options.endTimestamp) {
            constraints.push(where('timestamp', '<=', options.endTimestamp));
        }
        constraints.push(orderBy('timestamp', 'desc'));
        constraints.push(orderBy(documentId(), 'desc'));
        if (cursorTimestamp !== undefined && cursorId !== undefined) {
            constraints.push(startAfter(cursorTimestamp, cursorId));
        }
        const pageSize = Math.min(
            MENU_CHANGE_LOG_SCAN_PAGE_SIZE,
            MAX_MENU_CHANGE_LOG_SCAN_DOCUMENTS - documentsScanned,
        );
        constraints.push(firestoreLimit(pageSize));

        const snapshot = await getDocs(query(collectionRef, ...constraints));
        documentsScanned += snapshot.size;
        for (const document of snapshot.docs) {
            const normalized = normalizeChangeSnapshot([document]);
            if (normalized[0] && !visitor(normalized[0])) return;
        }

        if (snapshot.size < pageSize) return;
        const lastDocument = snapshot.docs[snapshot.docs.length - 1];
        const lastData = lastDocument?.data();
        if (!lastDocument || !lastData || lastData.timestamp === undefined) {
            logMenuChangeLogDiagnostic('menu_change_log_pagination_cursor_invalid', {
                ...getBoundedMenuChangeLogStringContext('documentId', lastDocument?.id),
            });
            return;
        }
        cursorTimestamp = lastData.timestamp;
        cursorId = lastDocument.id;
    }
};

/**
 * Get change history for a project
 * 
 * NOTE: This is for internal system use only
 * NOT for UI display - per MOL v0 doctrine
 */
export async function getChangeHistory(
    projectId: string,
    options: ChangeLogQueryOptions = {}
): Promise<MenuChangeLogEntry[]> {
    return await apiCallComposer(
        async () => {
            const normalizedProjectId = normalizeMenuChangeLogIdentifier(projectId, 'projectId');
            const normalizedLimit = normalizeMenuChangeLogQueryLimit(options.limit);
            const timestampCursor = getValidTimestampCursor(options.startAfterTimestamp);
            const normalizedItemId = options.itemId === undefined
                ? undefined
                : normalizeMenuChangeLogIdentifier(options.itemId, 'itemId');
            const normalizedCategoryId = options.categoryId === undefined
                ? undefined
                : normalizeMenuChangeLogIdentifier(options.categoryId, 'categoryId');
            const entries: MenuChangeLogEntry[] = [];

            await visitStoredMenuChanges({
                scope: await getActiveMenuChangeScope(),
                startAfterTimestamp: timestampCursor,
                startAfterId: options.startAfterId,
            }, entry => {
                if (entry.projectId !== normalizedProjectId
                    || (normalizedItemId !== undefined && entry.itemId !== normalizedItemId)
                    || (normalizedCategoryId !== undefined && entry.categoryId !== normalizedCategoryId)
                    || (options.changeType !== undefined && entry.changeType !== options.changeType)) {
                    return true;
                }
                entries.push(entry);
                return entries.length < normalizedLimit;
            });

            return entries;
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
            const normalizedProjectId = normalizeMenuChangeLogIdentifier(projectId, 'projectId');
            const normalizedItemId = normalizeMenuChangeLogIdentifier(itemId, 'itemId');
            const sinceTimestamp = getValidDateTimestamp(since, 'since date');
            let count = 0;
            await visitStoredMenuChanges({
                scope: await getActiveMenuChangeScope(),
                startTimestamp: sinceTimestamp,
            }, entry => {
                if (entry.projectId === normalizedProjectId
                    && entry.itemId === normalizedItemId
                    && entry.changeType === changeType) {
                    count += 1;
                }
                return true;
            });
            return count;
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
    endDate: Date,
    options: Pick<ChangeLogQueryOptions, 'limit' | 'startAfterId' | 'startAfterTimestamp'> = {},
): Promise<MenuChangeLogEntry[]> {
    return await apiCallComposer(
        async () => {
            const normalizedProjectId = normalizeMenuChangeLogIdentifier(projectId, 'projectId');
            const startTimestamp = getValidDateTimestamp(startDate, 'start date');
            const endTimestamp = getValidDateTimestamp(endDate, 'end date');
            if (startTimestamp.toMillis() > endTimestamp.toMillis()) {
                throw new RangeError('Menu change log start date must not be after end date');
            }
            const normalizedLimit = normalizeMenuChangeLogQueryLimit(options.limit);
            const timestampCursor = getValidTimestampCursor(options.startAfterTimestamp);
            const entries: MenuChangeLogEntry[] = [];
            await visitStoredMenuChanges({
                scope: await getActiveMenuChangeScope(),
                startTimestamp,
                endTimestamp,
                startAfterTimestamp: timestampCursor,
                startAfterId: options.startAfterId,
            }, entry => {
                if (entry.projectId === normalizedProjectId) entries.push(entry);
                return entries.length < normalizedLimit;
            });
            return entries;
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
    itemData: Readonly<{ name?: unknown; price?: unknown; category?: unknown }>,
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
    extractedValue: unknown,
    correctedValue: unknown,
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
    summary: Record<string, unknown>,
    actor: ChangeActor = 'OWNER',
    userId?: string,
    metadata?: Record<string, unknown>,
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
    itemData: Readonly<{ name?: unknown; price?: unknown; category?: unknown }>,
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
