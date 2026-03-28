import { DB_COLLECTIONS } from "@constant/database";
import { collection, getDoc, getDocs, limit, orderBy, query, startAfter, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import dayjs from "dayjs";
import { addDoc, doc, DocumentData } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.MENULIST_AI_OPERATIONS;

const getCollectionRef = async () => {
    const session = await getActiveSession();
    return collection(firebaseClient, `${COLLECTION}/${session.tId}/${session.sId}`)
}

const getDocRef = (docId: any) => {
    return doc(firebaseClient, `${COLLECTION}`, docId)
}

export const getAllAiOperations = async () => {
    return await apiCallComposer(
        async () => {
            const querySnapshot = await getDocs(await getCollectionRef());
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id })
            });
            return (list);
        },
        "getAllAiOperations"
    );
}

// Pagination and filter options interface
interface PaginationOptions {
    pageSize: number;
    pageNumber: number;
    lastVisibleDoc?: any;
    dateRange?: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;
    action?: string | null;
}

// Response interface for paginated data
interface PaginatedResponse {
    data: any[];
    lastVisibleDoc: any;
    hasMore: boolean;
}

/**
 * Get AI operations with pagination and filtering
 * @param options - Pagination and filter options
 * @returns Promise with paginated data, last visible document, and hasMore flag
 */
export const getPaginatedAiOperations = async (options: PaginationOptions): Promise<PaginatedResponse> => {
    return await apiCallComposer(
        async () => {
            const { pageSize, pageNumber, lastVisibleDoc, dateRange, action } = options;

            const collectionRef = await getCollectionRef();
            let finalQuery;

            // We'll build the query parameters differently to avoid TypeScript spread operator issues
            if (pageNumber > 1 && lastVisibleDoc) {
                // Query with cursor-based pagination (for page 2 and beyond)
                if (action && dateRange && dateRange[0] && dateRange[1]) {
                    // With both action and date filters
                    const startDate = dateRange[0].startOf('day').toDate();
                    const endDate = dateRange[1].endOf('day').toDate();
                    finalQuery = query(
                        collectionRef,
                        orderBy('createdOn', 'desc'),
                        where('action', '==', action),
                        where('createdOn', '>=', startDate),
                        where('createdOn', '<=', endDate),
                        limit(pageSize),
                        startAfter(lastVisibleDoc)
                    );
                } else if (action) {
                    // With only action filter
                    finalQuery = query(
                        collectionRef,
                        orderBy('createdOn', 'desc'),
                        where('action', '==', action),
                        limit(pageSize),
                        startAfter(lastVisibleDoc)
                    );
                } else if (dateRange && dateRange[0] && dateRange[1]) {
                    // With only date filter
                    const startDate = dateRange[0].startOf('day').toDate();
                    const endDate = dateRange[1].endOf('day').toDate();
                    finalQuery = query(
                        collectionRef,
                        orderBy('createdOn', 'desc'),
                        where('createdOn', '>=', startDate),
                        where('createdOn', '<=', endDate),
                        limit(pageSize),
                        startAfter(lastVisibleDoc)
                    );
                } else {
                    // No filters, just pagination
                    finalQuery = query(
                        collectionRef,
                        orderBy('createdOn', 'desc'),
                        limit(pageSize),
                        startAfter(lastVisibleDoc)
                    );
                }
            } else {
                // First page queries
                if (action && dateRange && dateRange[0] && dateRange[1]) {
                    // With both action and date filters
                    const startDate = dateRange[0].startOf('day').toDate();
                    const endDate = dateRange[1].endOf('day').toDate();
                    finalQuery = query(
                        collectionRef,
                        orderBy('createdOn', 'desc'),
                        where('action', '==', action),
                        where('createdOn', '>=', startDate),
                        where('createdOn', '<=', endDate),
                        limit(pageSize)
                    );
                } else if (action) {
                    // With only action filter
                    finalQuery = query(
                        collectionRef,
                        orderBy('createdOn', 'desc'),
                        where('action', '==', action),
                        limit(pageSize)
                    );
                } else if (dateRange && dateRange[0] && dateRange[1]) {
                    // With only date filter
                    const startDate = dateRange[0].startOf('day').toDate();
                    const endDate = dateRange[1].endOf('day').toDate();
                    finalQuery = query(
                        collectionRef,
                        orderBy('createdOn', 'desc'),
                        where('createdOn', '>=', startDate),
                        where('createdOn', '<=', endDate),
                        limit(pageSize)
                    );
                } else {
                    // No filters, just first page
                    finalQuery = query(
                        collectionRef,
                        orderBy('createdOn', 'desc'),
                        limit(pageSize)
                    );
                }
            }

            // Execute query
            const querySnapshot = await getDocs(finalQuery);

            // Process results
            const data: any[] = [];
            querySnapshot.forEach((doc) => {
                const docData = doc.data() as DocumentData;
                data.push({ ...docData, id: doc.id });
            });

            // Get the last visible document for next pagination
            const lastVisible = querySnapshot.docs.length > 0 ?
                querySnapshot.docs[querySnapshot.docs.length - 1] : null;

            // Check if there might be more data
            const hasMore = data.length === pageSize;

            return {
                data,
                lastVisibleDoc: lastVisible,
                hasMore
            };
        },
        options,
        "getPaginatedAiOperations"
    );
};

export const getAiOperationsByStoreId = async (storeId) => {
    return await apiCallComposer(
        async () => {
            const ref = query(await getCollectionRef(), where("storeId", "==", storeId));
            const querySnapshot = await getDocs(ref);
            if (querySnapshot.empty) {
                return ([]);
            } else {
                const list: any = [];
                querySnapshot.forEach((doc) => {
                    list.push({ ...doc.data(), id: doc.id })
                });
                return (list)
            }
        },
        storeId,
        "getAiOperationsByStoreId"
    );
}

export const getAiOperationById = async (id: number) => {
    return await apiCallComposer(
        async () => {
            const collectionDocRef = await getDocRef(id);
            const docSnap = await getDoc(collectionDocRef);
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                return null
            }
        },
        id,
        "getAiOperationById"
    );
}

export const addAiOperation = async (data: any) => {
    return await apiCallComposer(
        async () => {
            //add user first
            const docRef = await addDoc(await getCollectionRef(), await requestBodyComposer(data));
            data.id = docRef.id
            return docRef.id;
        },
        data,
        "addAiOperation"
    );
}