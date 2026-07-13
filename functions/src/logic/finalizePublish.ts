import type { IngestionJob } from '../types';
import { dispatchPublishingEmbeddingTasks, finalizePublishingJob } from './kbPublishingLifecycle';

/**
 * Compatibility wrapper for older emulator imports.
 * The durable job document, per-article completion sets, and run identity remain
 * authoritative; caller-provided counters are never used to publish a job.
 */
export async function finalizePublishLogic(job: IngestionJob, jobId: string) {
    await dispatchPublishingEmbeddingTasks(jobId, job);
    return finalizePublishingJob(jobId);
}
