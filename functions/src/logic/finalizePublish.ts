import { Timestamp } from "firebase-admin/firestore";
import * as functions from 'firebase-functions';
import { firestoreAdmin } from "../firebaseAdmin";
import { INGESTION_JOB_COLLECTION, INGESTION_JOB_STATUS, IngestionJob } from "../types";

const FINALIZE_PUBLISH_FAILED_CODE = 'ANSWERLATTICE_FINALIZE_PUBLISH_FAILED';
const FINALIZE_PUBLISH_STATUS_UPDATE_FAILED_CODE = 'ANSWERLATTICE_FINALIZE_PUBLISH_STATUS_UPDATE_FAILED';
const FINALIZE_PUBLISH_FAILED_MESSAGE = 'Finalize publish failed';

function boundedDiagnosticValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed.slice(0, 80) : null;
    }
    return null;
}

function getFinalizePublishErrorContext(error: unknown): Record<string, string | number | null> {
    const sourceError = error as { code?: unknown; status?: unknown; statusCode?: unknown };
    return {
        sourceErrorName: error instanceof Error ? (error.name || 'Error').slice(0, 80) : typeof error,
        sourceErrorCode: boundedDiagnosticValue(sourceError?.code),
        sourceErrorStatus: boundedDiagnosticValue(sourceError?.status || sourceError?.statusCode),
    };
}

function getFinalizePublishJobContext(job: IngestionJob, jobId: string): Record<string, string | number | boolean> {
    return {
        jobIdLength: jobId.length,
        jobStatus: String(job.status || ''),
        articlesToEmbedCount: Number(job.articlesToEmbedCount || 0),
        articlesEmbeddedCount: Number(job.articlesEmbeddedCount || 0),
        hasTenantScope: job.tId != null,
        hasStoreScope: job.sId != null,
    };
}

export const finalizePublishLogic = async (job: IngestionJob, jobId: string) => {
    const logger = functions.logger;
    const jobRef = firestoreAdmin.collection(INGESTION_JOB_COLLECTION).doc(jobId);
    logger.info('[finalizePublishLogic] Finalizer check', getFinalizePublishJobContext(job, jobId));

    try {
        if (job.status !== INGESTION_JOB_STATUS.PUBLISHING) {
            logger.info('[finalizePublishLogic] Job is not in PUBLISHING state. Skipping.', getFinalizePublishJobContext(job, jobId));
            return null;
        }

        const toEmbed = job.articlesToEmbedCount || 0;
        const done = job.articlesEmbeddedCount || 0;

        logger.info('[finalizePublishLogic] Article embedding progress', {
            jobIdLength: jobId.length,
            articlesEmbeddedCount: done,
            articlesToEmbedCount: toEmbed,
        });

        if (toEmbed === 0 || (done > 0 && done === toEmbed)) {
            logger.info('[finalizePublishLogic] All embeddings complete or no articles to embed. Marking job as published.', {
                jobIdLength: jobId.length,
                articlesEmbeddedCount: done,
                articlesToEmbedCount: toEmbed,
            });
            await jobRef.update({ status: INGESTION_JOB_STATUS.PUBLISHED, modifiedOn: Timestamp.now(), publishedOn: Timestamp.now() });
        }

        return null;
    } catch (error: any) {
        logger.error('[finalizePublishLogic] Worker failed to finalize publish', {
            failureCode: FINALIZE_PUBLISH_FAILED_CODE,
            ...getFinalizePublishJobContext(job, jobId),
            ...getFinalizePublishErrorContext(error),
        });
        // BUG FIX: Previously incremented articlesEmbeddedCount on error, corrupting job state.
        // Now we log the error and mark the job as failed instead.
        try {
            await jobRef.update({
                status: INGESTION_JOB_STATUS.FAILED,
                errorMessage: FINALIZE_PUBLISH_FAILED_MESSAGE,
                modifiedOn: Timestamp.now(),
            });
        } catch (updateError: any) {
            logger.error('[finalizePublishLogic] Failed to update job status after finalizer error', {
                failureCode: FINALIZE_PUBLISH_STATUS_UPDATE_FAILED_CODE,
                ...getFinalizePublishJobContext(job, jobId),
                ...getFinalizePublishErrorContext(updateError),
            });
        }
        return null;
    }
};
