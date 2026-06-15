import { BATCH_IMAGE_GENERATION_JOB_STATUS } from "@constant/AI";
import { DB_COLLECTIONS } from "@constant/database";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { BatchImageGenerationJobType } from "@template/main-app/projects/types";

const COLLECTION = DB_COLLECTIONS.IMAGE_BATCH_PROCESSING_JOBS;
const MAX_STATUS_HISTORY_ENTRIES = 20;

function getScopedJobRef(id: string, tenantId: string | number, storeId: string | number) {
    return firestoreAdmin.doc(`${COLLECTION}/${tenantId}/${storeId}/${id}`);
}

function removeUndefined(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(removeUndefined);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([, nestedValue]) => nestedValue !== undefined)
                .map(([key, nestedValue]) => [key, removeUndefined(nestedValue)]),
        );
    }
    return value;
}

export async function getImageBatchProcessingJobByIdAdmin(
    id: string,
    scope: { sId: string | number; tId: string | number },
): Promise<BatchImageGenerationJobType | null> {
    const snap = await getScopedJobRef(id, scope.tId, scope.sId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as BatchImageGenerationJobType;
}

export async function updateImageBatchProcessingJobAdmin(
    data: Partial<BatchImageGenerationJobType> & { id: string; incrementGeneratedCount?: boolean },
    projectId: string,
) {
    const [tId, , sId] = projectId.split("-");
    if (!tId || !sId) {
        throw new Error("Invalid project scope for image batch job update.");
    }

    const processedData: Record<string, unknown> = { ...data };
    const specialFields: Record<string, unknown> = {};
    let latestStatusEntry: unknown;

    if (Array.isArray(data.statusHistory) && data.statusHistory.length > 0) {
        latestStatusEntry = removeUndefined(data.statusHistory[data.statusHistory.length - 1]);
        delete processedData.statusHistory;
    }

    if ("generatedCount" in processedData || data.incrementGeneratedCount) {
        delete processedData.generatedCount;
        delete processedData.incrementGeneratedCount;
        specialFields.generatedCount = admin.firestore.FieldValue.increment(1);
    }

    const finalData: Record<string, unknown> = {
        ...(removeUndefined(processedData) as Record<string, unknown>),
        ...specialFields,
        modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
    };

    const jobRef = getScopedJobRef(data.id, tId, sId);
    if (latestStatusEntry) {
        await firestoreAdmin.runTransaction(async (transaction) => {
            const snap = await transaction.get(jobRef);
            const currentHistory = Array.isArray(snap.data()?.statusHistory) ? snap.data()?.statusHistory : [];
            finalData.statusHistory = [...currentHistory, latestStatusEntry].slice(-MAX_STATUS_HISTORY_ENTRIES);
            transaction.set(jobRef, {
                ...finalData,
            }, { merge: true });
        });
        return finalData;
    }

    await jobRef.set(finalData, { merge: true });
    return finalData;
}

export async function appendImageBatchItemResultAdmin({
    jobId,
    item,
    projectId,
}: {
    jobId: string;
    item: BatchImageGenerationJobType['itemsList'][number];
    projectId: string;
}) {
    const [tId, , sId] = projectId.split("-");
    if (!tId || !sId) {
        throw new Error("Invalid project scope for image batch item update.");
    }

    const jobRef = getScopedJobRef(jobId, tId, sId);
    return firestoreAdmin.runTransaction(async (transaction) => {
        const snap = await transaction.get(jobRef);
        if (!snap.exists) {
            throw new Error(`Image batch job ${jobId} not found.`);
        }

        const currentJob = { id: snap.id, ...snap.data() } as BatchImageGenerationJobType;
        const currentItems = Array.isArray(currentJob.itemsList) ? [...currentJob.itemsList] : [];
        const existingIndex = currentItems.findIndex((existingItem) => existingItem.id === item.id);
        const nextItem = removeUndefined(item) as BatchImageGenerationJobType['itemsList'][number];

        const existingItemAlreadyGenerated = existingIndex >= 0
            && Array.isArray(currentItems[existingIndex]?.images)
            && currentItems[existingIndex].images.length > 0;

        if (existingIndex >= 0) {
            currentItems[existingIndex] = nextItem;
        } else {
            currentItems.push(nextItem);
        }

        const totalImages = Number(currentJob.totalImages || currentItems.length || 0);
        const currentGeneratedCount = Number(currentJob.generatedCount || 0);
        const nextGeneratedCount = existingItemAlreadyGenerated
            ? currentGeneratedCount
            : Math.min(currentGeneratedCount + 1, Math.max(totalImages, currentGeneratedCount + 1));
        const nextStatus = totalImages > 0 && nextGeneratedCount >= totalImages
            ? BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED
            : BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING;
        const statusReason = totalImages > 0
            ? existingItemAlreadyGenerated
                ? `Item ${item.id} was already generated; kept progress at ${nextGeneratedCount} out of ${totalImages}`
                : `Generated ${nextGeneratedCount} out of ${totalImages}`
            : `Generated ${nextGeneratedCount} images`;

        const statusHistoryEntry = removeUndefined({
            status: nextStatus,
            reason: statusReason,
            createdOn: new Date().toISOString(),
        });
        const currentStatusHistory = Array.isArray(currentJob.statusHistory) ? currentJob.statusHistory : [];

        const updateData = {
            generatedCount: nextGeneratedCount,
            itemsList: currentItems,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
            status: nextStatus,
            statusHistory: [...currentStatusHistory, statusHistoryEntry].slice(-MAX_STATUS_HISTORY_ENTRIES),
        };

        transaction.set(jobRef, updateData, { merge: true });

        return {
            generatedCount: nextGeneratedCount,
            itemCount: currentItems.length,
            status: nextStatus,
            totalImages,
        };
    });
}

export async function markImageBatchProcessingJobFailedAdmin(
    jobId: string,
    projectId: string,
    reason: string,
) {
    return updateImageBatchProcessingJobAdmin({
        error: reason,
        id: jobId,
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
        statusHistory: [
            {
                status: BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
                reason,
                createdOn: new Date().toISOString(),
            },
        ],
    }, projectId);
}
