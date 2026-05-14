/**
 * Production-Only Firestore Triggers
 * ═══════════════════════════════════════════════════════════════
 * 
 * These are onDocumentCreated/onDocumentUpdated triggers that only
 * run in deployed (production) environments. In the emulator,
 * dev-triggers.ts provides callable equivalents for manual testing.
 * 
 * Why separate? Firestore triggers auto-fire on every write.
 * In dev, we want manual control via callable functions instead.
 */

import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { FirestoreEvent, onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { FUNCTION_OPTIONS, SECRET_GROUPS } from '../config/secrets';
import { finalizePublishLogic } from '../logic/finalizePublish';
import { processMenuImagesJobLogic } from '../logic/processMenuImagesJob';
import { startGenerationLogic } from '../logic/startGeneration';
import {
    INGESTION_JOB_COLLECTION,
    INGESTION_JOB_STATUS,
    IngestionJob,
    MENU_IMAGE_PROCESSING_JOBS_COLLECTION,
    MenuImageProcessingJob,
} from '../types';

// STEP 2 - KB Ingestion: Triggered when a new ingestion job doc is created
export const startGeneration = onDocumentCreated(
    { ...FUNCTION_OPTIONS.aiEventTrigger, document: `${INGESTION_JOB_COLLECTION}/{jobId}` },
    async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { jobId: string }>) => {
        const logger = functions.logger;
        const snap = event.data;
        const { jobId } = event.params;

        logger.info(`[${jobId}] Starting generation. Updating status to 'processing'.`);
        if (!snap) {
            logger.error('No data associated with the event trigger.');
            return;
        }

        const job = snap.data() as IngestionJob;
        await startGenerationLogic(jobId, job);
    },
);

// STEP 8 - KB Ingestion: Triggered when ingestion job doc is updated (finalize publish)
export const finalizePublish = onDocumentUpdated(
    { ...FUNCTION_OPTIONS.aiEventTrigger, document: `${INGESTION_JOB_COLLECTION}/{jobId}` },
    async (event) => {
        const logger = functions.logger;
        const before = event.data?.before.data() as IngestionJob;
        const after = event.data?.after.data() as IngestionJob;
        const jobId = event.params.jobId;

        if (!before || !after) {
            logger.info(`[${jobId}] No data change detected.`);
            return null;
        }

        if (after.status !== INGESTION_JOB_STATUS.PUBLISHING || before.articlesEmbeddedCount === after.articlesEmbeddedCount) {
            return null;
        }
        await finalizePublishLogic(after, jobId);
        return null;
    },
);

// Menu Image Processing: Triggered when a new processing job doc is created
export const processMenuImagesJob = onDocumentCreated(
    {
        ...FUNCTION_OPTIONS.aiParallel,
        secrets: [
            ...FUNCTION_OPTIONS.aiParallel.secrets,
            ...SECRET_GROUPS.PUBLIC_CACHE_REVALIDATION,
        ],
        document: `${MENU_IMAGE_PROCESSING_JOBS_COLLECTION}/{jobId}`,
    },
    async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { jobId: string }>) => {
        const logger = functions.logger;
        const snap = event.data;
        const { jobId } = event.params;

        logger.info(`[processMenuImagesJob] Job created: ${jobId}`);
        if (!snap) {
            logger.error(`[processMenuImagesJob] No data associated with the event trigger for job ${jobId}`);
            return;
        }

        const job = snap.data() as MenuImageProcessingJob;
        await processMenuImagesJobLogic(jobId, job);
    },
);
