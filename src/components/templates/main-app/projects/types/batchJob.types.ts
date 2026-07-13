/**
 * Batch Job Types
 * 
 * Types for batch image generation jobs.
 */

import { BatchImageGenerationJobStatusType } from "@constant/AI";
import { UserUploadedFileType } from "@type/common";
import { GenerateImageViaApiPayloadGenerationConfiType } from "./imageGeneration.types";

export type BatchImageItemExecutionStatus =
    | 'processing'
    | 'retry_pending'
    | 'staged'
    | 'completed'
    | 'failed';

export type BatchImageAccountingInput = {
    action: 'batch_image_generation';
    billingMode?: 'billable' | 'free';
    candidatesTokenCount?: number;
    chargePerCredit?: number;
    clientResponse?: {
        generatedImageCount: number;
        responseSummaryKind: 'batch_image_generation';
    };
    failedPromptCount?: number;
    imageCount?: number;
    marginPaise?: number;
    model?: string;
    ourChargePaise?: number;
    processingTime?: number;
    projectId: string;
    promptCacheHitCount?: number;
    promptCount?: number;
    promptTokenCount?: number;
    realCostPaise?: number;
    sId: number;
    source?: 'ai_image_prompt_cache' | 'gemini_image_generation';
    tId: number;
    tokenPerCredit?: number;
    totalCharge?: number;
    totalCredits?: number;
    totalTokenCount?: number;
    uId?: string;
    unitsConsumed: number;
};

export type BatchImageItemExecution = {
    attemptCount: number;
    claimToken?: string;
    itemId: string;
    lastError?: string;
    leaseExpiresAtMs?: number;
    operationId: string;
    /** Accounting committed but output finalization still needs a retry. */
    requiresFinalization?: boolean;
    stagedAccountingInput?: BatchImageAccountingInput;
    stagedItem?: {
        id: string;
        name: string;
        images: UserUploadedFileType[];
    };
    stagedStoragePaths?: string[];
    status: BatchImageItemExecutionStatus;
};

export type BatchImageGenerationJobType = {
    modifiedOn?: string | number | Date;
    createdOn?: string | number | Date;
    id?: string;
    enqueueFailedItemIds?: string[];
    failedItemIds?: string[];
    /** Server-owned summary used to prevent cancellation after durable output staging. */
    hasStagedResults?: boolean;
    itemExecutions?: Record<string, BatchImageItemExecution>;
    /** Server-authored, lexicographically sortable project/job key used by the one-document listener. */
    projectJobKey?: string;
    requestedItemIds?: string[];
    selectedImagesPersisted?: boolean;
    status: BatchImageGenerationJobStatusType;
    totalImages: number;
    generatedCount: number;
    generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
    projectId: string;
    itemsList: {
        id: string;
        name: string;
        images: UserUploadedFileType[]
    }[];
    statusHistory: {
        status: BatchImageGenerationJobStatusType;
        reason?: string;
        createdOn: string | number | Date;
    }[];
    error?: string;
}
