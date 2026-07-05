import { AI_ACTIONS_TYPES } from "@constant/common";
import { checkExistingActiveJob, createMenuProcessingJob, MenuFileToProcess, TargetLanguage } from "@lib/firebase/menuProcessing";
import { getBoundedMenuProcessingStringContext, getMenuProcessingProjectLogContext, logMenuProcessingFailure } from "@lib/firebase/menuProcessingDiagnostics";
import { ProcessedFileAPIParams } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// JOB QUEUE ONLY - No legacy code
// Creates job in Firestore, server handles processing via trigger
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result from creating a menu processing job
 */
export interface CreateJobResult {
  jobId: string;
}

/**
 * Create a menu processing job
 * 
 * Flow:
 * 1. Check for existing active job (prevent duplicates)
 * 2. Create job document in Firestore with files and targetLanguages
 * 3. Return job ID immediately
 * 4. Server processes via:
 *    - PROD: onCreate trigger (automatic)
 *    - DEV: dev_triggerProcessMenuImages callable (called automatically in createMenuProcessingJob)
 * 5. Client uses useMenuProcessingJob hook to track progress
 * 6. Server saves results directly to project
 * 
 * @param files - Files with uploaded URLs (already uploaded to Storage)
 * @param targetLanguages - Languages to extract
 * @param projectId - Project to save results to
 * @param action - Processing action type
 * @returns Job ID for tracking
 */
async function createProcessingJob({
  files,
  targetLanguages,
  projectId,
  businessCategory,
  businessType,
  identityOverrideConfirmed,
  action = AI_ACTIONS_TYPES.IMAGE_PROCESSING
}: ProcessedFileAPIParams): Promise<CreateJobResult> {

  try {
    // Check for existing active job to prevent duplicates
    const existingJobId = await checkExistingActiveJob(projectId);
    if (existingJobId) {
      return { jobId: existingJobId };
    }

    // Create new job (in DEV, this also calls dev_triggerProcessMenuImages)
    const jobId = await createMenuProcessingJob({
      projectId,
      files: files.map(f => ({
        uid: f.uid,
        name: f.name,
        size: f.size,
        type: f.type,
        url: f.url,
      })) as MenuFileToProcess[],
      targetLanguages: targetLanguages.map(l => ({
        code: l.code,
        name: l.name,
      })) as TargetLanguage[],
      action,
      businessCategory,
      businessType,
      identityOverrideConfirmed,
    });

    return { jobId };

  } catch (error) {
    logMenuProcessingFailure('desktop_menu_upload_job_create_failed', error, {
      ...getMenuProcessingProjectLogContext(projectId),
      ...getBoundedMenuProcessingStringContext('action', action),
      fileCount: files.length,
      targetLanguageCount: targetLanguages.length,
    });
    throw new Error('Menu processing failed. Please try again.');
  }
}

export default createProcessingJob;
