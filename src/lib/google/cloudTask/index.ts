import { CloudTasksClient } from '@google-cloud/tasks';
import { logger } from '@lib/monitoring/logger';
import { getImageBatchCloudTaskId } from '@lib/ai/imageBatchServerBoundary';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { GenerateImageViaApiPayloadBatchType } from '@template/main-app/projects/types';
import { menulistServerEnv } from '@lib/env/menulistServerEnv';

let client: CloudTasksClient | null = null;

const PROJECT_ID = menulistServerEnv.firebaseProjectId;
const QUEUE_LOCATION = menulistServerEnv.firebaseProjectLocation;
const QUEUE_ID = menulistServerEnv.batchImageGenerationQueueId;
const IMAGE_GENERATION_WORKER_URL = menulistServerEnv.batchImageGenerationWorkerUrl;
const IMAGE_GENERATION_WORKER_SECRET = menulistServerEnv.batchImageGenerationWorkerSecret;
const CLOUD_TASKS_BATCH_IMAGE_CONFIG_MISSING = 'cloud_tasks_batch_image_config_missing';

export const getImageGenerationTaskConfigStatus = () => ({
    ready: Boolean(PROJECT_ID && QUEUE_ID && IMAGE_GENERATION_WORKER_URL && QUEUE_LOCATION && IMAGE_GENERATION_WORKER_SECRET),
    hasProjectId: Boolean(PROJECT_ID),
    hasQueueId: Boolean(QUEUE_ID),
    hasQueueLocation: Boolean(QUEUE_LOCATION),
    hasWorkerSecret: Boolean(IMAGE_GENERATION_WORKER_SECRET),
    hasWorkerUrl: Boolean(IMAGE_GENERATION_WORKER_URL),
});

const requireImageGenerationTaskConfig = () => {
    if (
        !PROJECT_ID
        || !QUEUE_LOCATION
        || !QUEUE_ID
        || !IMAGE_GENERATION_WORKER_URL
        || !IMAGE_GENERATION_WORKER_SECRET
    ) {
        throw new Error('Cloud Tasks configuration is incomplete. Cannot enqueue image generation task.');
    }
    return {
        projectId: PROJECT_ID,
        queueLocation: QUEUE_LOCATION,
        queueId: QUEUE_ID,
        workerUrl: IMAGE_GENERATION_WORKER_URL,
        workerSecret: IMAGE_GENERATION_WORKER_SECRET,
    };
};

if (!getImageGenerationTaskConfigStatus().ready) {
    logRuntimeDiagnostic(CLOUD_TASKS_BATCH_IMAGE_CONFIG_MISSING, getImageGenerationTaskConfigStatus());
}

const getCloudTasksClient = (): CloudTasksClient => {
    if (client) return client;

    try {
        client = new CloudTasksClient();
        return client;
    } catch (error) {
        logRuntimeFailure('cloud_tasks_client_initialization_failed', error, getImageGenerationTaskConfigStatus());
        throw new Error('Failed to initialize Cloud Tasks client');
    }
};

const getOptionalArrayLength = (value: unknown): number => (
    Array.isArray(value) ? value.length : 0
);

const getImageGenerationTaskLogContext = (data: GenerateImageViaApiPayloadBatchType) => ({
    ...getBoundedRuntimeStringContext('projectId', data.projectId),
    ...getBoundedRuntimeStringContext('jobId', data.jobId),
    ...getBoundedRuntimeStringContext('itemId', data.itemDetails?.id),
    ...getBoundedRuntimeStringContext('itemName', data.itemDetails?.name),
    ...getBoundedRuntimeStringContext('businessType', data.businessType),
    hasItemDetails: Boolean(data.itemDetails),
    hasGenerationConfig: Boolean(data.generationConfig),
    hasReferenceImage: Boolean(data.generationConfig?.referanceImage?.url),
    requestedImageCount: Number(data.generationConfig?.numberOfImages || 0),
    styleCount: getOptionalArrayLength(data.generationConfig?.styles),
    selectedImageTypeCount: getOptionalArrayLength(data.generationConfig?.selectedImageTypes),
});

export async function enqueueImageGenerationTask(data: GenerateImageViaApiPayloadBatchType): Promise<string | undefined> {
    const configStatus = getImageGenerationTaskConfigStatus();
    if (!configStatus.ready) {
        logRuntimeDiagnostic(CLOUD_TASKS_BATCH_IMAGE_CONFIG_MISSING, configStatus);
        throw new Error('Cloud Tasks configuration is incomplete. Cannot enqueue image generation task.');
    }

    const config = requireImageGenerationTaskConfig();
    const cloudTasksClient = getCloudTasksClient();
    const parent = cloudTasksClient.queuePath(config.projectId, config.queueLocation, config.queueId);
    const taskId = getImageBatchCloudTaskId(String(data.jobId), String(data.itemDetails?.id));
    const taskName = cloudTasksClient.taskPath(
        config.projectId,
        config.queueLocation,
        config.queueId,
        taskId,
    );

    const task = {
        name: taskName,
        httpRequest: {
            httpMethod: 'POST' as const,
            url: config.workerUrl,
            headers: {
                'project-id': config.projectId,
                'x-menulist-task-secret': config.workerSecret,
                'Content-Type': 'application/json',
            },
            body: Buffer.from(JSON.stringify(data)).toString('base64'),
        },
        // scheduleTime: { // Optional: to schedule tasks in the future
        //   seconds: Date.now() / 1000 + 60, // 60 seconds from now
        // },
    };

    try {
        logger.info('Enqueueing batch image generation task', getImageGenerationTaskLogContext(data));
        const [response] = await cloudTasksClient.createTask({ parent, task });
        logger.info('Batch image generation task created', {
            ...getImageGenerationTaskLogContext(data),
            ...getBoundedRuntimeStringContext('taskName', response.name),
        });
        return response.name ?? undefined;
    } catch (error) {
        const errorCode = typeof error === 'object' && error !== null && 'code' in error
            ? (error as { code?: unknown }).code
            : undefined;
        if (errorCode === 6 || errorCode === '6' || errorCode === 'ALREADY_EXISTS') {
            logger.info('Batch image generation task already exists', {
                ...getImageGenerationTaskLogContext(data),
                ...getBoundedRuntimeStringContext('taskName', taskName),
            });
            return taskName;
        }
        logRuntimeFailure(
            'cloud_tasks_batch_image_task_create_failed',
            error,
            getImageGenerationTaskLogContext(data),
        );
        throw new Error('Failed to enqueue image generation task.');
    }
}
