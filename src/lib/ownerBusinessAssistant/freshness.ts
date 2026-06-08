import type { OwnerBusinessHealthCurrentDoc } from './types';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function formatOwnerBusinessHealthDateKey(value?: string | null): string | null {
  if (!value || !DATE_KEY_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(date);
}

export function getOwnerBusinessHealthFreshnessNote(
  current?: OwnerBusinessHealthCurrentDoc | null,
): string | null {
  if (!current) return null;

  if (current.status === 'not_ready' && !current.sourceRefs?.length) {
    return 'Business Health is not realtime. The first store check will show the data date here.';
  }

  const throughDate = current.sourceWindow?.lastSettledDate || current.sourceWindow?.today || current.localDate;
  const throughLabel = formatOwnerBusinessHealthDateKey(throughDate);
  if (!throughLabel) return 'Uses the latest available MenuList data. Today may not be complete yet.';

  return `Uses data through ${throughLabel}. Today may not be complete yet.`;
}
