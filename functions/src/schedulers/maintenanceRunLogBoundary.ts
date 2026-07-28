export type MaintenanceRunTaskStatus = 'success' | 'failed' | 'skipped';
export type MaintenanceRunStatus = 'success' | 'partial' | 'failed';

export function getMaintenanceRunStatus(
  summaries: ReadonlyArray<{ status: MaintenanceRunTaskStatus }>,
): MaintenanceRunStatus {
  const attempted = summaries.filter((summary) => summary.status !== 'skipped');
  if (attempted.length === 0) return 'success';

  const failedCount = attempted.filter((summary) => summary.status === 'failed').length;
  if (failedCount === 0) return 'success';
  return failedCount === attempted.length ? 'failed' : 'partial';
}
