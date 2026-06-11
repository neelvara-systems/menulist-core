/**
 * Batch Job Types
 * 
 * Types for batch image generation jobs.
 */

import { BatchImageGenerationJobStatusType } from "@constant/AI";
import { UserUploadedFileType } from "@type/common";
import { GenerateImageViaApiPayloadGenerationConfiType } from "./imageGeneration.types";

export type BatchImageGenerationJobType = {
    modifiedOn?: string | number | Date;
    createdOn?: string | number | Date;
    id?: string;
    requestedItemIds?: string[];
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
