export function getMonitoringErrorContext(error: unknown): {
  sourceErrorName?: string;
  sourceErrorCode?: string;
  sourceStatusCode?: number;
} {
  if (!error || typeof error !== 'object') return {};

  const record = error as { code?: unknown; status?: unknown; statusCode?: unknown };
  const status = Number(record.status ?? record.statusCode);
  return {
    sourceErrorName: error instanceof Error ? error.name || 'Error' : typeof error,
    sourceErrorCode: record.code === undefined || record.code === null
      ? undefined
      : String(record.code).slice(0, 64),
    sourceStatusCode: Number.isFinite(status) ? status : undefined,
  };
}
