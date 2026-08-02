export const MENU_PROCESSING_JOB_START_REJECTED_CODE = 'menu_processing_job_start_rejected' as const;

export type MenuProcessingJobStartCallerError = Error & {
    cleanupUploadedFilesAfterJobStartRejection?: boolean;
};

export function isDefinitiveMenuProcessingJobStartRejection(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const candidate = error as {
        code?: unknown;
        status?: unknown;
    };
    return candidate.code === MENU_PROCESSING_JOB_START_REJECTED_CODE
        && typeof candidate.status === 'number'
        && Number.isInteger(candidate.status)
        && (
            (candidate.status >= 400 && candidate.status < 500)
            || candidate.status === 503
        );
}

export function createMenuProcessingJobCallerError(error: unknown): MenuProcessingJobStartCallerError {
    const callerError = new Error('Menu processing failed. Please try again.') as MenuProcessingJobStartCallerError;
    if (isDefinitiveMenuProcessingJobStartRejection(error)) {
        callerError.cleanupUploadedFilesAfterJobStartRejection = true;
    }
    return callerError;
}

export function shouldCleanupUploadedFilesAfterJobStartError(error: unknown): boolean {
    return Boolean(
        error
        && typeof error === 'object'
        && (error as MenuProcessingJobStartCallerError).cleanupUploadedFilesAfterJobStartRejection === true,
    );
}
