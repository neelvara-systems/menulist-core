import { CloudTasksClient } from '@google-cloud/tasks';
import { logger } from '@lib/monitoring/logger';
import { GenerateImageViaApiPayloadBatchType } from '@template/main-app/projects/types';
import { writeLogEntry } from 'logs/utils';

const client = new CloudTasksClient();

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const QUEUE_LOCATION = process.env.FIREBASE_PROJECT_LOCATION;
const QUEUE_ID = process.env.BATCH_IMAGE_GENERATION_QUEUE_ID;
const IMAGE_GENERATION_WORKER_URL = process.env.BATCH_IMAGE_GENERATION_WORKER_URL;
const IMAGE_GENERATION_WORKER_SECRET = process.env.BATCH_IMAGE_GENERATION_WORKER_SECRET;

if (!PROJECT_ID || !QUEUE_ID || !IMAGE_GENERATION_WORKER_URL || !QUEUE_LOCATION || !IMAGE_GENERATION_WORKER_SECRET) {
    logger.warn('Cloud Tasks environment variables are incomplete for batch image generation', {
        hasProjectId: Boolean(PROJECT_ID),
        hasQueueId: Boolean(QUEUE_ID),
        hasQueueLocation: Boolean(QUEUE_LOCATION),
        hasWorkerSecret: Boolean(IMAGE_GENERATION_WORKER_SECRET),
        hasWorkerUrl: Boolean(IMAGE_GENERATION_WORKER_URL),
    });
}

const LOG_FILE = "batch-image-generation.log"

export async function enqueueImageGenerationTask(data: GenerateImageViaApiPayloadBatchType): Promise<string | undefined> {
    if (!client) {
        try {
            logger.debug('CloudTasksClient unavailable during image generation enqueue');
        } catch (error) {
            logger.error('Failed to initialize CloudTasksClient', error);
            await writeLogEntry({ logFileName: LOG_FILE, userId: 'N/A', projectId: 'N/A', logType: 'BATCH_GENERATION_TASK_ENQUEUED', error: { message: 'Failed to enqueue task' }, data: { failedTasks: "" } });
            throw new Error('Failed to initialize Cloud Tasks client');
        }
    }
    if (!PROJECT_ID || !QUEUE_ID || !IMAGE_GENERATION_WORKER_URL || !QUEUE_LOCATION || !IMAGE_GENERATION_WORKER_SECRET) {
        throw new Error('Cloud Tasks configuration is incomplete. Cannot enqueue image generation task.');
    }

    const parent = client.queuePath(PROJECT_ID, QUEUE_LOCATION, QUEUE_ID);

    const task = {
        httpRequest: {
            httpMethod: 'POST' as const,
            url: IMAGE_GENERATION_WORKER_URL,
            headers: {
                'project-id': process.env.FIREBASE_PROJECT_ID,
                'x-menulist-task-secret': IMAGE_GENERATION_WORKER_SECRET,
                'Content-Type': 'application/json',
            },
            body: Buffer.from(JSON.stringify(data)).toString('base64'),
        },
        // scheduleTime: { // Optional: to schedule tasks in the future
        //   seconds: Date.now() / 1000 + 60, // 60 seconds from now
        // },
    };

    try {
        logger.info('Enqueueing batch image generation task', {
            itemId: data.itemDetails?.id,
            jobId: data.jobId,
            projectId: data.projectId,
        });
        const [response] = await client.createTask({ parent, task });
        logger.info('Batch image generation task created', {
            itemId: data.itemDetails?.id,
            jobId: data.jobId,
            taskName: response.name,
        });
        return response.name;
    } catch (error) {
        logger.error('Error creating batch image generation task', error, {
            itemId: data.itemDetails?.id,
            jobId: data.jobId,
            projectId: data.projectId,
        });
        throw new Error('Failed to enqueue image generation task.');
    }
}
