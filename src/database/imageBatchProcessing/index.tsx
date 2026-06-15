import { BATCH_IMAGE_GENERATION_JOB_STATUS } from "@constant/AI";
import { DB_COLLECTIONS } from "@constant/database";
import { collection, getDoc, increment, limit, query, runTransaction, setDoc, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { BatchImageGenerationJobType } from "@template/main-app/projects/types";
import { addDoc, doc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.IMAGE_BATCH_PROCESSING_JOBS;
const ACTIVE_BATCH_JOB_QUERY_LIMIT = 5;
const MAX_STATUS_HISTORY_ENTRIES = 20;

const getCollectionRef = async () => {
    const session = await getActiveSession();
    return collection(firebaseClient, `${COLLECTION}/${session.tId}/${session.sId}`)
}

export const getBatchImageJobCollectionRef = (session: any, projectId: string) => {
    const collectionRef = collection(firebaseClient, `${COLLECTION}/${session.tId}/${session.sId}`);

    // Keep this listener bounded. The hook selects the newest visible job client-side
    // to avoid a new composite index for this tenant/store subcollection path.
    return query(
        collectionRef,
        where("projectId", "==", projectId),
        where("status", "in", [BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED, BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING, BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED, BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED]),
        limit(ACTIVE_BATCH_JOB_QUERY_LIMIT)
    );
}

const getDocRef = async (docId: any, session: any) => {
    return doc(firebaseClient, `${COLLECTION}/${session.tId}/${session.sId}`, docId)
}

export const getImageBatchProcessingJobById = async (id: string, session: any) => {
    return await apiCallComposer(
        async () => {
            const collectionDocRef = await getDocRef(id, session);
            const docSnap = await getDoc(collectionDocRef);
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                return null
            }
        },
        id,
        "getImageBatchProcessingJobById"
    );
}

export const addImageBatchProcessingJob = async (data: BatchImageGenerationJobType) => {
    return await apiCallComposer(
        async () => {
            //add user first
            const docRef = await addDoc(await getCollectionRef(), await requestBodyComposer(data));
            data.id = docRef.id
            return docRef.id;
        },
        data,
        "addImageBatchProcessingJob"
    );
}

export const updateImageBatchProcessingJob = async (data: any, projectId: string) => {
    return await apiCallComposer(
        async () => {
            // Create a copy of the data to work with
            let processedData = { ...data };
            let specialFields: any = {};

            // Handle statusHistory specially if it exists in the data
            let latestStatusEntry: any = null;
            if ("statusHistory" in data && Array.isArray(data.statusHistory) && data.statusHistory.length > 0) {
                // Extract the latest status entry (assuming it's the last one in the array)
                latestStatusEntry = data.statusHistory[data.statusHistory.length - 1];

                // Remove statusHistory from the processed data
                delete processedData.statusHistory;
            }

            // Handle generatedCount increment if it's a number
            if ("generatedCount" in data) {

                // Remove generatedCount from processed data
                delete processedData.generatedCount;
                delete processedData.incrementGeneratedCount;

                // Add to special fields
                specialFields.generatedCount = increment(1);
            }

            // Prepare the update data
            const updateData = await requestBodyComposer(processedData);

            // Merge in the special fields that use Firestore field operations
            const finalUpdateData = { ...updateData, ...specialFields };

            const [tId, _, sId] = projectId.split("-");
            const docRef = await getDocRef(data.id, { tId, sId });
            if (latestStatusEntry) {
                await runTransaction(firebaseClient, async (transaction) => {
                    const snap = await transaction.get(docRef);
                    const currentHistory = Array.isArray(snap.data()?.statusHistory) ? snap.data()?.statusHistory : [];
                    finalUpdateData.statusHistory = [...currentHistory, latestStatusEntry].slice(-MAX_STATUS_HISTORY_ENTRIES);
                    transaction.set(docRef, {
                        ...finalUpdateData,
                    }, { merge: true });
                });
                return finalUpdateData;
            }
            await setDoc(docRef, finalUpdateData, { merge: true });

            // Return the data in a format that matches what the caller expects
            return finalUpdateData;
        },
        data,
        "updateImageBatchProcessingJob"
    );
}
