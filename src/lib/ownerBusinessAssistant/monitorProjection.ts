export function normalizeOwnerBusinessAssistantMonitorTimestamp(
  value: unknown,
): string | null {
  if (value === undefined || value === null || value === '') return null;

  try {
    let candidate: unknown = value;
    if (candidate instanceof Date) {
      // Already normalized below.
    } else if (
      typeof candidate === 'object'
      && candidate !== null
      && typeof (candidate as { toDate?: unknown }).toDate === 'function'
    ) {
      candidate = (candidate as { toDate: () => unknown }).toDate();
    } else if (typeof candidate === 'object' && candidate !== null) {
      const record = candidate as Record<string, unknown>;
      const seconds = record.seconds ?? record._seconds;
      if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
      candidate = seconds * 1000;
    }

    const date = candidate instanceof Date
      ? candidate
      : typeof candidate === 'string' || typeof candidate === 'number'
        ? new Date(candidate)
        : null;
    return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
  } catch {
    return null;
  }
}
