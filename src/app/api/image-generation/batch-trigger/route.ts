export const dynamic = 'force-dynamic';
import { BATCH_IMAGE_GENERATION_JOB_STATUS } from '@constant/AI';
import { updateImageBatchProcessingJob } from '@database/imageBatchProcessing';
import { enqueueImageGenerationTask } from '@lib/google/cloudTask';
import { logger } from '@lib/monitoring/logger';
import { getLinkedOutletPolicyBlockReason } from '@lib/multiOutlet/serverOutletPolicy';
import { checkBatchOperationLimit } from '@lib/rateLimit/helpers';
import { validateAPIInput } from '@lib/security/inputValidation';
import { buildSecurityContext } from '@lib/security/securityContext';
import { BatchImageGenerationRequestSchema } from '@lib/validation/apiSchemas';
import { GenerateImageViaApiPayloadBatchType } from '@template/main-app/projects/types';
import { getISOStringDate } from '@util/dateTime';
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { withAuth } from "../../../../middleware/auth";

const LOG_FILE = "batch-image-generation.log"

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;

    try {

        // �️ SAFE_MODE: Block expensive operations during system maintenance
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        // �🔒 RATE LIMITING: Prevent batch job spam (3 per 5 minutes)
        const rateLimitResponse = await checkBatchOperationLimit();
        if (rateLimitResponse) return rateLimitResponse;

        // 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const rawData = await request.json();
        const validation = validateAPIInput(BatchImageGenerationRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            // Log to Sentry (potential attack attempt - HIGH severity: batch expensive operations)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/image-generation/batch-trigger',
                error: errorMsg,
                attemptedData: {
                    itemsListCount: rawData?.itemsList?.length || 0,
                    projectId: rawData?.projectId,
                    jobId: rawData?.jobId,
                },
            }, 'high'); // HIGH severity - batch expensive operations

            await writeMissingParamsLogEntry(LOG_FILE, userId, rawData?.projectId, '', rawData);
            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const { generationConfig, projectId, itemsList, businessType, jobId } = rawData as GenerateImageViaApiPayloadBatchType;

        const outletPolicyBlockReason = await getLinkedOutletPolicyBlockReason({
            action: "image",
            itemIds: itemsList.map((item) => item?.id ? String(item.id) : "").filter(Boolean),
            projectId,
            session,
        });
        if (outletPolicyBlockReason) {
            logger.security('Outlet Policy Violation - Batch Image Generation API', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/image-generation/batch-trigger',
                projectId,
                reason: outletPolicyBlockReason,
            }, 'medium');
            return NextResponse.json({ error: outletPolicyBlockReason }, { status: 403 });
        }

        await writeLogEntry({ logFileName: LOG_FILE, userId: userId, projectId: projectId, logType: 'BATCH_GENERATION_TASK_STARTED', error: null, data: { generationConfig, projectId, itemsList, jobId } });

        const taskPromises = itemsList.map(itemDetails => enqueueImageGenerationTask({ jobId, generationConfig, projectId, businessType, itemDetails })
            .catch(e => {
                logger.error(`Failed to enqueue task for menu item ${itemDetails.id}`, e);
                return ({ menuItemId: itemDetails.id, error: e.message || 'Failed to enqueue task' })
            })
        );

        const results = await Promise.allSettled(taskPromises);

        await writeLogEntry({ logFileName: LOG_FILE, userId: userId, projectId: projectId, logType: 'BATCH_GENERATION_TASK_ENQUEUED', error: null, data: results });

        const failedTasks = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value && typeof r.value === 'object' && r.value.error));
        if (failedTasks.length > 0) {
            logger.warn(`Some tasks failed to enqueue`, { jobId, failedCount: failedTasks.length });

            // Determine failure reason
            const allTasksFailed = failedTasks.length === itemsList.length;
            const statusReason = allTasksFailed
                ? 'GCT FAILURE: All tasks failed to enqueue.'
                : `GCT FAILURE: Failed to enqueue ${failedTasks.length}/${itemsList.length} tasks.`;

            // Single job status update
            await updateImageBatchProcessingJob({
                id: jobId,
                status: BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
                statusHistory: [
                    {
                        status: BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
                        reason: statusReason,
                        createdOn: getISOStringDate(),
                    },
                ]
            }, projectId);

            await writeLogEntry({ logFileName: LOG_FILE, userId: userId, projectId, logType: 'BATCH_GENERATION_TASK_FAILED', error: { message: 'Failed to enqueue tasks' }, data: { failedTasks: failedTasks } });
            return NextResponse.json({ jobId, warning: statusReason }, { status: 500 });
        }

        await writeLogEntry({ logFileName: LOG_FILE, userId: userId, projectId: projectId, logType: 'BATCH_GENERATION_TASK_COMPLETED', error: null, data: null });
        return NextResponse.json({ data: { jobId }, message: 'Batch job started successfully' }, { status: 200 });

    } catch (error) {
        logger.error('Batch trigger API error', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json({ error: 'Batch trigger failed', message: errorMessage }, { status: 500 });
    }
});
