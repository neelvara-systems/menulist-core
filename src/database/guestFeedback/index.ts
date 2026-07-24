/**
 * Guest Feedback Data Access Layer (DAL)
 *
 * Handles all Firestore operations for the guest feedback collection.
 *
 * This client DAL is authenticated and store-scoped. Anonymous submissions use
 * the public API route and its Admin SDK server DAL.
 *
 * @see __docs__/projects/internal-feedback-system/
 */

import { DB_COLLECTIONS } from '@constant/database';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import getActiveSession from '@lib/auth/getActiveSession';
import { normalizeGuestFeedbackNumericDocumentId, normalizeGuestFeedbackProjectId } from '@lib/feedback/guestFeedbackProjectIdBoundary';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { GuestFeedback, GuestFeedbackFilter } from '@type/guestFeedback';
import {
    collection,
    doc,
    getCountFromServer,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    QueryConstraint,
    runTransaction,
    serverTimestamp,
    startAfter,
    Timestamp,
    where
} from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.GUEST_FEEDBACK;
const FEEDBACK_PAGE_SIZE_MAX = 100;

export type GuestFeedbackListResult = {
    items: GuestFeedback[];
    lastDocId: string | null;
    hasMore: boolean;
};

export type GuestFeedbackExpectedScope = {
    storeId: number;
    tenantId: number;
};

const normalizeOptionalString = (value: unknown, maxLength: number): string | null | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length <= maxLength ? normalized : null;
};

export const normalizeGuestFeedbackRecord = (value: unknown, id: string): GuestFeedback | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !isValidFirestoreDocumentId(id)) return null;
    const record = value as Record<string, unknown>;
    const tenantScope = normalizeGuestFeedbackNumericDocumentId(record.tId);
    const storeScope = normalizeGuestFeedbackNumericDocumentId(record.sId);
    const projectId = normalizeGuestFeedbackProjectId(record.projectId);
    const message = normalizeOptionalString(record.message, 300);
    const customerName = normalizeOptionalString(record.customerName, 60);
    const customerPhone = normalizeOptionalString(record.customerPhone, 20);
    const customerEmail = normalizeOptionalString(record.customerEmail, 120);
    const ownerNote = normalizeOptionalString(record.ownerNote, 300);
    const modifiedBy = normalizeOptionalString(record.modifiedBy, 128);
    const rating = record.rating;
    const status = record.status;
    const expectedNeedsAttention = typeof rating === 'number' && rating <= 3 && status === 'new';
    if (
        !tenantScope
        || !storeScope
        || !projectId
        || !Number.isInteger(rating)
        || Number(rating) < 1
        || Number(rating) > 5
        || (status !== 'new' && status !== 'resolved')
        || record.needsAttention !== expectedNeedsAttention
        || record.createdBy !== 'guest'
        || !(record.createdOn instanceof Timestamp)
        || !(record.expiresOn instanceof Timestamp)
        || (record.modifiedOn !== undefined && !(record.modifiedOn instanceof Timestamp))
        || message === null
        || customerName === null
        || customerPhone === null
        || customerEmail === null
        || ownerNote === null
        || modifiedBy === null
        || (customerEmail !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))
        || (record.source !== 'menu_footer' && record.source !== 'feedback_qr' && record.source !== 'direct_link')
    ) {
        return null;
    }

    return {
        id,
        tId: tenantScope.numericId,
        sId: storeScope.numericId,
        projectId,
        rating: Number(rating) as GuestFeedback['rating'],
        source: record.source,
        status,
        needsAttention: expectedNeedsAttention,
        createdBy: 'guest',
        createdOn: record.createdOn,
        expiresOn: record.expiresOn,
        ...(message !== undefined ? { message } : {}),
        ...(customerName !== undefined ? { customerName } : {}),
        ...(customerPhone !== undefined ? { customerPhone } : {}),
        ...(customerEmail !== undefined ? { customerEmail } : {}),
        ...(ownerNote !== undefined ? { ownerNote } : {}),
        ...(record.modifiedOn instanceof Timestamp ? { modifiedOn: record.modifiedOn } : {}),
        ...(modifiedBy !== undefined ? { modifiedBy } : {}),
    };
};

const isGuestFeedbackRecord = (result: unknown, expectedFeedbackId?: string): result is GuestFeedback => {
    if (!result || typeof result !== 'object' || Array.isArray(result)) return false;
    const resultId = (result as { id?: unknown }).id;
    return typeof resultId === 'string'
        && (expectedFeedbackId === undefined || resultId === expectedFeedbackId)
        && normalizeGuestFeedbackRecord(result, resultId) !== null;
};

const normalizeFeedbackFilter = (filter: unknown): GuestFeedbackFilter | null => (
    filter === 'all' || filter === 'needs_attention' || filter === 'resolved' ? filter : null
);

const resolveSessionScope = (session: unknown) => {
    const record = session && typeof session === 'object' ? session as Record<string, unknown> : {};
    const tenant = normalizeGuestFeedbackNumericDocumentId(record.tId);
    const store = normalizeGuestFeedbackNumericDocumentId(record.sId);
    const userId = normalizeOptionalString(record.uId, 128);
    if (!tenant || !store || !userId) throw new Error('Guest feedback session scope is invalid');
    return { tenantId: tenant.numericId, storeId: store.numericId, userId };
};

const assertExpectedFeedbackScope = (
    scope: GuestFeedbackExpectedScope,
    expectedScope?: GuestFeedbackExpectedScope,
) => {
    if (
        expectedScope
        && (
            scope.tenantId !== expectedScope.tenantId
            || scope.storeId !== expectedScope.storeId
        )
    ) {
        throw new Error('Guest feedback session scope changed');
    }
};

export const isGuestFeedbackListResult = (
    result: unknown,
    expectedScope?: GuestFeedbackExpectedScope,
): result is GuestFeedbackListResult => {
    if (!result || typeof result !== 'object' || Array.isArray(result)) return false;
    const candidate = result as GuestFeedbackListResult;
    if (
        !Array.isArray(candidate.items)
        || typeof candidate.hasMore !== 'boolean'
        || (
            candidate.lastDocId !== null
            && (
                typeof candidate.lastDocId !== 'string'
                || !isValidFirestoreDocumentId(candidate.lastDocId)
            )
        )
    ) return false;
    const ids = new Set<string>();
    for (const item of candidate.items) {
        if (
            !isGuestFeedbackRecord(item)
            || ids.has(item.id)
            || (
                expectedScope
                && (
                    item.tId !== expectedScope.tenantId
                    || item.sId !== expectedScope.storeId
                )
            )
        ) return false;
        ids.add(item.id);
    }
    return candidate.items.length === 0
        ? candidate.lastDocId === null && candidate.hasMore === false
        : candidate.lastDocId === candidate.items.at(-1)?.id;
};

export function assertFeedbackListLoadSucceeded(
    result: unknown,
    rejectionCode = 'feedback_list_load_rejected',
    expectedScope?: GuestFeedbackExpectedScope,
): asserts result is GuestFeedbackListResult {
    if (isGuestFeedbackListResult(result, expectedScope)) return;
    throw new Error(rejectionCode);
}

export function assertFeedbackCountLoadSucceeded(
    result: unknown,
    rejectionCode = 'feedback_count_load_rejected',
): asserts result is number {
    if (typeof result === 'number' && Number.isSafeInteger(result) && result >= 0) return;
    throw new Error(rejectionCode);
}

/**
 * Get collection reference for guest feedback
 */
const getCollectionRef = () => {
    return collection(firebaseClient, COLLECTION);
};

/**
 * Get document reference for a specific feedback
 */
const getDocRef = (feedbackId: string) => {
    return doc(firebaseClient, COLLECTION, feedbackId);
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTICATED OPERATIONS (Owner/Manager)
// Used by dashboard feedback inbox - uses apiCallComposer pattern
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get feedback list for a store (AUTHENTICATED)
 * Uses session from getActiveSession() for tenant/store isolation
 *
 * @param filter - Filter type: all, needs_attention, resolved
 * @param pageSize - Number of items per page
 * @param cursorId - Pagination cursor (document ID from previous page)
 */
export const getFeedbackList = async (
    filter: GuestFeedbackFilter = 'all',
    pageSize: number = 50,
    cursorId?: string,
    expectedScope?: GuestFeedbackExpectedScope,
): Promise<GuestFeedbackListResult> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = resolveSessionScope(session);
            assertExpectedFeedbackScope(scope, expectedScope);
            const normalizedFilter = normalizeFeedbackFilter(filter);
            if (!normalizedFilter) throw new Error('Invalid guest feedback filter');
            if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > FEEDBACK_PAGE_SIZE_MAX) {
                throw new Error('Invalid guest feedback page size');
            }

            const constraints: QueryConstraint[] = [
                where('tId', '==', scope.tenantId),
                where('sId', '==', scope.storeId),
            ];

            // Filter by status
            if (normalizedFilter === 'needs_attention') {
                constraints.push(where('needsAttention', '==', true));
            } else if (normalizedFilter === 'resolved') {
                constraints.push(where('status', '==', 'resolved'));
            }

            // Order by newest first
            constraints.push(orderBy('createdOn', 'desc'));

            // Pagination - if cursor provided, fetch that doc first for startAfter
            if (cursorId) {
                if (!isValidFirestoreDocumentId(cursorId)) throw new Error('Invalid guest feedback cursor');
                const cursorDoc = await getDoc(getDocRef(cursorId));
                const cursor = cursorDoc.exists() ? normalizeGuestFeedbackRecord(cursorDoc.data(), cursorDoc.id) : null;
                if (!cursor || cursor.tId !== scope.tenantId || cursor.sId !== scope.storeId) {
                    throw new Error('Guest feedback cursor is outside the active store');
                }
                constraints.push(startAfter(cursorDoc));
            }
            constraints.push(limit(pageSize + 1)); // +1 to check if there's more

            const q = query(getCollectionRef(), ...constraints);
            const snapshot = await getDocs(q);

            const normalizedPage = snapshot.docs.map((docSnap) => {
                const feedback = normalizeGuestFeedbackRecord(docSnap.data(), docSnap.id);
                if (!feedback) {
                    throw new Error('Guest feedback contains an invalid persisted record');
                }
                return feedback;
            });
            const items = normalizedPage.slice(0, pageSize);
            const lastDocId = items.at(-1)?.id ?? null;
            const hasMore = normalizedPage.length > pageSize;

            return { items, lastDocId, hasMore };
        },
        { filter, pageSize, cursorId, expectedScope },
        'getFeedbackList'
    );
};

/**
 * Get single feedback by ID (AUTHENTICATED)
 * Uses session from getActiveSession() for tenant isolation
 *
 * @param feedbackId - Feedback document ID
 */
export const getFeedbackById = async (
    feedbackId: string,
    expectedScope?: GuestFeedbackExpectedScope,
): Promise<GuestFeedback | null> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = resolveSessionScope(session);
            assertExpectedFeedbackScope(scope, expectedScope);
            if (!isValidFirestoreDocumentId(feedbackId)) return null;
            const docSnap = await getDoc(getDocRef(feedbackId));

            if (!docSnap.exists()) {
                return null;
            }

            const data = normalizeGuestFeedbackRecord(docSnap.data(), docSnap.id);
            if (!data) return null;

            // Tenant/store isolation check. HQ users operate through the active
            // selected-store context; this DAL does not aggregate across stores.
            if (data.tId !== scope.tenantId) {
                return null;
            }

            if (data.sId !== scope.storeId) {
                return null;
            }

            return data;
        },
        { feedbackId, expectedScope },
        'getFeedbackById'
    );
};

/**
 * Update feedback status (AUTHENTICATED)
 * Uses session from getActiveSession() for tenant isolation and modifiedBy
 *
 * @param feedbackId - Feedback document ID
 * @param status - New status
 * @param ownerNote - Optional note
 */
export const updateFeedbackStatus = async (
    feedbackId: string,
    status: 'new' | 'resolved',
    ownerNote?: string,
    expectedScope?: GuestFeedbackExpectedScope,
): Promise<GuestFeedback | null> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = resolveSessionScope(session);
            assertExpectedFeedbackScope(scope, expectedScope);
            if (!isValidFirestoreDocumentId(feedbackId) || (status !== 'new' && status !== 'resolved')) return null;
            const normalizedOwnerNote = normalizeOptionalString(ownerNote, 300);
            if (normalizedOwnerNote === null) throw new Error('Guest feedback owner note is invalid');
            const feedbackRef = getDocRef(feedbackId);
            return runTransaction(firebaseClient, async (transaction) => {
                const snapshot = await transaction.get(feedbackRef);
                const existing = snapshot.exists() ? normalizeGuestFeedbackRecord(snapshot.data(), snapshot.id) : null;
                if (!existing || existing.tId !== scope.tenantId || existing.sId !== scope.storeId) return null;
                const updateData: Partial<GuestFeedback> = {
                    status,
                    needsAttention: existing.rating <= 3 && status === 'new',
                    modifiedBy: scope.userId,
                    ...(ownerNote !== undefined ? { ownerNote: normalizedOwnerNote || '' } : {}),
                };
                transaction.update(feedbackRef, {
                    ...updateData,
                    modifiedOn: serverTimestamp(),
                });
                const { modifiedOn: _previousModifiedOn, ...existingWithoutModifiedOn } = existing;
                return { ...existingWithoutModifiedOn, ...updateData };
            });
        },
        { feedbackId, status, ownerNote, expectedScope },
        'updateFeedbackStatus'
    );
};

export function assertFeedbackStatusUpdateSucceeded(
    result: unknown,
    expectedFeedbackId: string,
    expectedStatus: 'new' | 'resolved',
    rejectionCode = 'feedback_status_update_rejected',
): asserts result is GuestFeedback {
    if (!isGuestFeedbackRecord(result, expectedFeedbackId)) throw new Error(rejectionCode);
    const updatedFeedback = result as GuestFeedback;
    if (
        updatedFeedback.status !== expectedStatus
    ) {
        throw new Error(rejectionCode);
    }
}

/**
 * Get feedback count by filter (for badge display)
 * Uses session from getActiveSession() for tenant/store isolation
 *
 * NOTE: This is a simple count query. For large datasets,
 * consider using a counter document instead.
 *
 * @param filter - Filter type
 */
export const getFeedbackCount = async (
    filter: GuestFeedbackFilter = 'needs_attention',
    expectedScope?: GuestFeedbackExpectedScope,
): Promise<number> => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const scope = resolveSessionScope(session);
            assertExpectedFeedbackScope(scope, expectedScope);
            const normalizedFilter = normalizeFeedbackFilter(filter);
            if (!normalizedFilter) throw new Error('Invalid guest feedback filter');
            const constraints: QueryConstraint[] = [
                where('tId', '==', scope.tenantId),
                where('sId', '==', scope.storeId),
            ];

            if (normalizedFilter === 'needs_attention') {
                constraints.push(where('needsAttention', '==', true));
            } else if (normalizedFilter === 'resolved') {
                constraints.push(where('status', '==', 'resolved'));
            }

            const q = query(getCollectionRef(), ...constraints);
            const snapshot = await getCountFromServer(q);
            return snapshot.data().count;
        },
        { filter, expectedScope },
        'getFeedbackCount'
    );
};
