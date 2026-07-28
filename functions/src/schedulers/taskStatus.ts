export type SchedulerTaskStatus = 'success' | 'failed';

export function getSchedulerTaskStatus(failureCount: number): SchedulerTaskStatus {
    return Number.isSafeInteger(failureCount) && failureCount === 0
        ? 'success'
        : 'failed';
}
