import { CloudTasksClient } from '@google-cloud/tasks';
import { GenerateImageViaApiPayloadBatchType } from '@template/main-app/projects/types';
import { writeLogEntry } from 'logs/utils';

const client = new CloudTasksClient();

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const QUEUE_LOCATION = process.env.FIREBASE_PROJECT_LOCATION;
const QUEUE_ID = process.env.BATCH_IMAGE_GENERATION_QUEUE_ID;
const IMAGE_GENERATION_WORKER_URL = process.env.BATCH_IMAGE_GENERATION_WORKER_URL;

if (!PROJECT_ID || !QUEUE_ID || !IMAGE_GENERATION_WORKER_URL) {
    console.warn('Cloud Tasks environment variables (GOOGLE_CLOUD_PROJECT, IMAGE_GENERATION_QUEUE_ID, IMAGE_GENERATION_WORKER_URL, FIREBASE_PROJECT_LOCATION) are not fully set. Task enqueuing might fail.');
}

const LOG_FILE = "batch-image-generation.log"

export async function enqueueImageGenerationTask(data: GenerateImageViaApiPayloadBatchType): Promise<string | undefined> {
    // Dynamically import the CloudTasksClient to avoid ESM/CJS issues

    console.log("Step1: inside enqueueImageGenerationTask:Enqueueing task for project", data.projectId, "item", data.itemDetails.id, "at", new Date());


    if (!client) {
        try {
            console.log("Step2: inside enqueueImageGenerationTask:Importing CloudTasksClient");
        } catch (error) {
            console.error('Step3: inside enqueueImageGenerationTask:Failed to import CloudTasksClient:', error);
            await writeLogEntry({ logFileName: LOG_FILE, userId: 'N/A', projectId: 'N/A', logType: 'BATCH_GENERATION_TASK_ENQUEUED', error: { message: 'Failed to enqueue task' }, data: { failedTasks: "" } });
            throw new Error('Step6: inside enqueueImageGenerationTask:Failed to initialize Cloud Tasks client');
        }
    }
    console.log("Step4: inside enqueueImageGenerationTask:CloudTasksClient initialized");
    if (!PROJECT_ID || !QUEUE_ID || !IMAGE_GENERATION_WORKER_URL || !QUEUE_LOCATION) {
        throw new Error('Step5: inside enqueueImageGenerationTask:Cloud Tasks configuration is incomplete. Cannot enqueue task.');
    }


    // const queueName = `${QUEUE_ID}-${data.projectId.split("-")[0]}`;
    const parent = client.queuePath(PROJECT_ID, QUEUE_LOCATION, QUEUE_ID);//this will generate project wise unique batch

    const task = {
        httpRequest: {
            httpMethod: 'POST' as const,
            url: IMAGE_GENERATION_WORKER_URL,
            headers: {
                'project-id': process.env.FIREBASE_PROJECT_ID,
                'Content-Type': 'application/json',
            },
            body: Buffer.from(JSON.stringify(data)).toString('base64'),
        },
        // scheduleTime: { // Optional: to schedule tasks in the future
        //   seconds: Date.now() / 1000 + 60, // 60 seconds from now
        // },
    };

    try {
        console.log("Step6: inside enqueueImageGenerationTask:Task enqueued for project", data.projectId, "item", data.itemDetails.id, "parent", parent, "task", task, "at", new Date());
        const [response] = await client.createTask({ parent, task });
        console.log(`Step7: inside enqueueImageGenerationTask:Created task ${response.name}`);
        return response.name;
    } catch (error) {
        console.error('Step7: inside enqueueImageGenerationTask:Error creating task:', error);
        throw new Error('Step8: inside enqueueImageGenerationTask:Failed to enqueue image generation task.');
    }
}
