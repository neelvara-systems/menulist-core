import { Timestamp } from "firebase-admin/firestore";
import * as functions from 'firebase-functions';
import { firestoreAdmin } from "../firebaseAdmin";
import { INGESTION_JOB_COLLECTION, INGESTION_JOB_STATUS, IngestionJob } from "../types";

export const finalizePublishLogic = async (job: IngestionJob, jobId: string) => {
    const logger = functions.logger;
    const jobRef = firestoreAdmin.collection(INGESTION_JOB_COLLECTION).doc(jobId);
    logger.info(`[finalizePublishLogic] Finalizer check. with job id ${jobId} and job data ${job}`);

    try {
        if (job.status !== INGESTION_JOB_STATUS.PUBLISHING) {
            logger.info(`[finalizePublishLogic] Job ${jobId} is not in PUBLISHING state. Skipping.`);
            return null;
        }

        const toEmbed = job.articlesToEmbedCount || 0;
        const done = job.articlesEmbeddedCount || 0;

        logger.info(`[finalizePublishLogic] Finalizer check: ${done} of ${toEmbed} articles embedded.`);

        if (toEmbed === 0 || (done > 0 && done === toEmbed)) {
            logger.info(`[finalizePublishLogic] All embeddings complete or no articles to embed. Marking job as published.`);
            await jobRef.update({ status: INGESTION_JOB_STATUS.PUBLISHED, modifiedOn: Timestamp.now(), publishedOn: Timestamp.now() });
        }

        return null;
    } catch (error: any) {
        logger.error(`[finalizePublishLogic] Worker failed to finalize publish:`, error);
        // BUG FIX: Previously incremented articlesEmbeddedCount on error, corrupting job state.
        // Now we log the error and mark the job as failed instead.
        try {
            await jobRef.update({
                status: INGESTION_JOB_STATUS.FAILED,
                errorMessage: `Finalize publish failed: ${error.message || 'Unknown error'}`,
                modifiedOn: Timestamp.now(),
            });
        } catch (updateError: any) {
            logger.error(`[finalizePublishLogic] Failed to update job status after error:`, updateError);
        }
        return null;
    }
};