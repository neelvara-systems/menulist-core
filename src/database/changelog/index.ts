import { DB_COLLECTIONS } from '@constant/database';
import uploadBase64ToStorage from '@database/storage/uploadBase64ToStorage';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import getActiveSession from '@lib/auth/getActiveSession';
import { revalidateAnswerlatticePublicClientCache } from '@lib/cache/answerlatticePublicClientCache';
import { answerlatticeFirebaseClient, answerlatticeStorage } from '@lib/firebase/answerlatticeFirebaseClient';
import { STORAGE_CACHE_CONTROL } from '@lib/storage/cacheControl';
import { generateStoragePath } from '@lib/storage/pathGenerator';
import { ChangelogPage } from '@type/changelog';
import { UserUploadedFileType } from '@type/common';
import {
    collection,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    runTransaction,
    Timestamp,
    where
} from 'firebase/firestore';

const db = answerlatticeFirebaseClient;
const PAGE_SIZE_LIMIT = 900_000; // 900 KB safety margin

const COLLECTION = DB_COLLECTIONS.CHANGELOG;

/**
 * Upload changelog file to Firebase Storage with tenant/store isolation
 * @param data - File data with base64 content
 * @param type - File category (e.g., 'files', 'documents')
 */
const uploadImage = async (data: UserUploadedFileType, type = 'files') => {

    let uploadedUrl: any = '';
    const docId = `${new Date().getTime()}-${data.uid}`;

    if (data.url?.includes('base64')) {
        // Get fresh session for tenant-scoped storage paths
        const session = await getActiveSession();

        // Generate tenant/store-scoped path for multi-tenancy isolation
        const path = generateStoragePath({
            collection: COLLECTION,
            fileType: type,
            session,
            fileId: docId
        });

        // Upload to Firebase Storage
        uploadedUrl = await uploadBase64ToStorage({
            cacheControl: STORAGE_CACHE_CONTROL.immutablePublic,
            fileId: docId,
            storage: answerlatticeStorage,
            url: data.url,
            path,
            type: data.type
        })
    }
    return uploadedUrl || data.url;
}

// Helper to estimate the size of a JavaScript object
async function estimateSizeBytes(obj: any): Promise<number> {
    try {
        // Blob is more accurate for Firestore's UTF-8 based calculation
        return new Blob([JSON.stringify(obj)]).size;
    } catch {
        // Fallback for environments where Blob is not available
        return JSON.stringify(obj).length;
    }
}


const getCollectionRef = (session: any) => {
    return collection(answerlatticeFirebaseClient, `${COLLECTION}/${session.tId}/${session.sId}`)
}

/**
 * Adds a new entry to the changelog. It handles page creation and rolling over when the page size limit is reached.
 * This operation is performed within a transaction to ensure atomicity.
 */
export const addChangelogEntry = async (entryPayload: any) => {
    // Perform file uploads before the transaction starts
    if (entryPayload.files && entryPayload.files.length > 0) {
        for (let i = 0; i < entryPayload.files.length; i++) {
            if (entryPayload.files[i].url.includes('base64')) {
                entryPayload.files[i].url = await uploadImage(entryPayload.files[i]);
            }
        }
    }

    const session = await getActiveSession();
    const result = await runTransaction(db, async (tx) => {
        const pagesCollectionRef = getCollectionRef(session);
        const latestPageQuery = query(pagesCollectionRef, orderBy('pageNumber', 'desc'), limit(1));
        const latestPageSnap = await getDocs(latestPageQuery);

        const newEntryId = crypto.randomUUID();

        const newEntryForEstimate = await answerlatticeRequestBodyComposer({
            id: newEntryId,
            ...entryPayload,
        });

        if (latestPageSnap.empty) {
            // First entry, create the first page
            const newPageNumber = 1;
            const newPageId = `page_${String(newPageNumber).padStart(6, '0')}`;
            const newPageRef = doc(pagesCollectionRef, newPageId);

            const newPageData = await answerlatticeRequestBodyComposer({
                pageNumber: newPageNumber,
                nextPageId: null,
                entries: [{ ...newEntryForEstimate, createdOn: Timestamp.now() }],
                entryIds: [newEntryId],
            });

            tx.set(newPageRef, newPageData);
            return { createdNewPage: true, pageId: newPageId, entryId: newEntryId };
        } else {
            const latestPageDoc = latestPageSnap.docs[0];
            const latestPageRef = latestPageDoc.ref;
            const latestPageData = latestPageDoc.data();

            const combinedEntriesForEstimate = [newEntryForEstimate, ...(latestPageData.entries || [])];
            const estSize = await estimateSizeBytes({ ...latestPageData, entries: combinedEntriesForEstimate });

            if (estSize < PAGE_SIZE_LIMIT) {
                // Append to the current latest page
                const newEntries = [{ ...newEntryForEstimate, createdOn: Timestamp.now() }, ...(latestPageData.entries || [])];
                const newEntryIds = [newEntryId, ...(latestPageData.entryIds || [])];
                const pageUpdatePayload = await answerlatticeRequestBodyComposer({ isUpdate: true });
                tx.update(latestPageRef, {
                    entries: newEntries,
                    entryIds: newEntryIds,
                    approxSizeBytes: estSize,
                    modifiedOn: pageUpdatePayload.modifiedOn,
                    modifiedBy: pageUpdatePayload.modifiedBy,
                });
                return { appended: true, pageId: latestPageDoc.id, entryId: newEntryId };
            } else {
                // Page is full, create a new page
                const newPageNumber = (latestPageData.pageNumber || 0) + 1;
                const newPageId = `page_${String(newPageNumber).padStart(6, '0')}`;
                const newPageRef = doc(pagesCollectionRef, newPageId);

                const newPageData = await answerlatticeRequestBodyComposer({
                    pageNumber: newPageNumber,
                    nextPageId: latestPageDoc.id || null,
                    entries: [{ ...newEntryForEstimate, createdOn: Timestamp.now() }],
                    entryIds: [newEntryId],
                });

                tx.set(newPageRef, newPageData);
                return { createdNewPage: true, pageId: newPageId, entryId: newEntryId };
            }
        }
    });
    await revalidateAnswerlatticePublicClientCache({ tId: session?.tId, sId: session?.sId }, ['changelog', 'context'], 'addChangelogEntry');
    return result;
};

/**
 * Fetches the most recent changelog page.
 */
export const fetchLatestChangelogPage = async (): Promise<ChangelogPage | null> => {
    const session = await getActiveSession();
    const pagesCollectionRef = getCollectionRef(session);
    const q = query(pagesCollectionRef, orderBy('pageNumber', 'desc'), limit(1));
    const snap = await getDocs(q);

    if (snap.empty) {
        return null;
    }

    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as ChangelogPage;
};

/**
 * Loads an older changelog page based on the current page number.
 */
export const loadOlderChangelogPage = async (currentPageNumber: number): Promise<ChangelogPage | null> => {
    const session = await getActiveSession();
    const pagesCollectionRef = getCollectionRef(session);
    const q = query(
        pagesCollectionRef,
        where('pageNumber', '<', currentPageNumber),
        orderBy('pageNumber', 'desc'),
        limit(1)
    );

    const snap = await getDocs(q);
    if (snap.empty) {
        return null;
    }

    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as ChangelogPage;
};

/**
 * Updates the feedback count (likes or dislikes) for a specific changelog entry.
 * This operation is performed within a transaction to ensure atomicity.
 */
export const updateChangelogFeedback = async (pageId: string, entryId: string, feedbackType: 'like' | 'dislike', increment: boolean = true) => {
    const session = await getActiveSession();
    const pagesCollectionRef = getCollectionRef(session);
    const pageRef = doc(pagesCollectionRef, pageId);

    return runTransaction(db, async (tx) => {
        const pageDoc = await tx.get(pageRef);

        if (!pageDoc.exists()) {
            throw new Error(`Changelog page with ID "${pageId}" does not exist.`);
        }

        const pageData = pageDoc.data() as ChangelogPage;
        const entries = pageData.entries || [];
        const entryIndex = entries.findIndex(entry => entry.id === entryId);

        if (entryIndex === -1) {
            throw new Error(`Changelog entry with ID "${entryId}" not found in page "${pageId}".`);
        }

        const entryToUpdate = { ...entries[entryIndex] };

        if (feedbackType === 'like') {
            entryToUpdate.likes = increment
                ? (entryToUpdate.likes || 0) + 1
                : Math.max(0, (entryToUpdate.likes || 0) - 1);
        } else if (feedbackType === 'dislike') {
            entryToUpdate.dislikes = increment
                ? (entryToUpdate.dislikes || 0) + 1
                : Math.max(0, (entryToUpdate.dislikes || 0) - 1);
        }

        const updatedEntries = [
            ...entries.slice(0, entryIndex),
            entryToUpdate,
            ...entries.slice(entryIndex + 1),
        ];

        tx.update(pageRef, { entries: updatedEntries });

        return entryToUpdate; // Return the updated entry for immediate UI feedback
    });
};

/**
 * Deletes a changelog entry from its page.
 */
export const deleteChangelogEntry = async (entryId: string) => {
    const session = await getActiveSession();
    const result = await runTransaction(db, async (tx) => {
        const pagesCollectionRef = getCollectionRef(session);
        const q = query(pagesCollectionRef, where('entryIds', 'array-contains', entryId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error(`Entry with ID ${entryId} not found.`);
        }

        const pageDoc = querySnapshot.docs[0];
        const pageRef = pageDoc.ref;
        const pageData = pageDoc.data() as ChangelogPage;

        const updatedEntries = pageData.entries.filter(entry => entry.id !== entryId);
        const updatedEntryIds = pageData.entryIds.filter(id => id !== entryId);

        const updatePayload = await answerlatticeRequestBodyComposer({ isUpdate: true });

        tx.update(pageRef, {
            entries: updatedEntries,
            entryIds: updatedEntryIds,
            modifiedOn: updatePayload.modifiedOn,
            modifiedBy: updatePayload.modifiedBy,
        });

        return { deleted: true, entryId: entryId, pageId: pageDoc.id };
    });
    await revalidateAnswerlatticePublicClientCache({ tId: session?.tId, sId: session?.sId }, ['changelog', 'context'], 'deleteChangelogEntry');
    return result;
};

export const updateChangelogEntry = async (entryId: string, updatedPayload: any) => {
    // Perform file uploads before the transaction starts
    if (updatedPayload.files && updatedPayload.files.length > 0) {
        for (let i = 0; i < updatedPayload.files.length; i++) {
            if (updatedPayload.files[i].url.includes('base64')) {
                updatedPayload.files[i].url = await uploadImage(updatedPayload.files[i]);
            }
        }
    }

    const session = await getActiveSession();
    const result = await runTransaction(db, async (tx) => {
        const pagesCollectionRef = getCollectionRef(session);
        const q = query(pagesCollectionRef, where('entryIds', 'array-contains', entryId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error(`Entry with ID ${entryId} not found.`);
        }

        const pageDoc = querySnapshot.docs[0];
        const pageRef = pageDoc.ref;
        const pageData = pageDoc.data() as ChangelogPage;

        const entryIndex = pageData.entries.findIndex(entry => entry.id === entryId);
        if (entryIndex === -1) {
            throw new Error(`Entry with ID ${entryId} not found within the page.`);
        }

        const updatePayloadWithTimestamp = await answerlatticeRequestBodyComposer({ ...updatedPayload, isUpdate: true });
        const updatedEntries = [...pageData.entries];
        updatedEntries[entryIndex] = { ...updatedEntries[entryIndex], ...updatePayloadWithTimestamp };

        tx.update(pageRef, {
            entries: updatedEntries,
            modifiedOn: updatePayloadWithTimestamp.modifiedOn,
            modifiedBy: updatePayloadWithTimestamp.modifiedBy,
        });

        return { updated: true, entryId: entryId, pageId: pageDoc.id };
    });
    await revalidateAnswerlatticePublicClientCache({ tId: session?.tId, sId: session?.sId }, ['changelog', 'context'], 'updateChangelogEntry');
    return result;
};
