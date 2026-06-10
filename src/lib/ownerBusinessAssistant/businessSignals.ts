import type {
  OwnerBusinessAnalyticsIndexDoc,
  OwnerBusinessAnalyticsPeriod,
  OwnerBusinessHealthCheck,
} from './types';

export type OwnerBusinessSignalAction = 'promote' | 'fix' | 'restock' | 'update';

export type OwnerBusinessActivityMetric = {
  key: string;
  label: string;
  value: string;
  detail?: string;
};

const numberFormatter = new Intl.NumberFormat('en');

const formatCount = (value?: number) => numberFormatter.format(
  typeof value === 'number' && Number.isFinite(value) ? value : 0,
);

export const OWNER_BUSINESS_SIGNAL_ACTION_LABELS: Record<OwnerBusinessSignalAction, string> = {
  promote: 'Promote',
  fix: 'Fix',
  restock: 'Restock',
  update: 'Update',
};

export const getOwnerBusinessPrimaryAnalyticsPeriod = (
  periods: OwnerBusinessAnalyticsIndexDoc['periods'] | undefined,
) => periods?.today
  || periods?.thisWeek
  || periods?.last7Days
  || periods?.yesterday
  || null;

const formatSourceName = (source?: string) => {
  const normalized = String(source || '').trim();
  if (!normalized) return 'Source';

  const lower = normalized.toLowerCase();
  if (lower.includes('whatsapp')) return 'WhatsApp';
  if (lower.includes('instagram')) return 'Instagram';
  if (lower.includes('google')) return 'Google';
  if (lower.includes('qr')) return 'QR';
  if (lower.includes('website')) return 'Website';
  if (lower.includes('public')) return 'Public menu';
  if (lower.includes('obp')) return 'Business page';

  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .slice(0, 40);
};

const getBestSource = (period?: OwnerBusinessAnalyticsPeriod | null) => {
  const sources = (period?.sourceQuality || [])
    .filter((source) => typeof source.visits === 'number' && source.visits > 0)
    .sort((a, b) => b.visits - a.visits || (b.actionRate || 0) - (a.actionRate || 0));

  return sources[0] || null;
};

export const buildOwnerBusinessActivityMetrics = (
  period?: OwnerBusinessAnalyticsPeriod | null,
): OwnerBusinessActivityMetric[] => {
  if (!period) return [];

  const topItem = period.topItems?.[0];
  const bestSource = getBestSource(period);

  return [
    {
      key: 'menu-views',
      label: 'Menu views',
      value: formatCount(period.metrics.menuVisits),
      detail: period.label,
    },
    topItem ? {
      key: 'top-demand',
      label: 'Top demand',
      value: topItem.name || topItem.itemId,
      detail: `Promote: ${formatCount(topItem.value)} ${topItem.signal}`,
    } : null,
    bestSource ? {
      key: 'best-source',
      label: 'Best source',
      value: formatSourceName(bestSource.source),
      detail: `Update link: ${formatCount(bestSource.visits)} visits`,
    } : null,
  ].filter(Boolean) as OwnerBusinessActivityMetric[];
};

export const getOwnerBusinessCheckAction = (
  check: OwnerBusinessHealthCheck,
): OwnerBusinessSignalAction => {
  const id = check.id.toLowerCase();
  const actionType = (check.actionType || '').toLowerCase();
  const searchable = `${id} ${actionType} ${check.title} ${check.message}`.toLowerCase();

  if (searchable.includes('unavailable') || searchable.includes('out of stock') || searchable.includes('sold out')) {
    return 'restock';
  }

  if (searchable.includes('feedback') || searchable.includes('review') || searchable.includes('wrong')) {
    return 'fix';
  }

  if (
    searchable.includes('active menu')
    || searchable.includes('menu source')
    || searchable.includes('sharing')
    || searchable.includes('link')
    || searchable.includes('profile')
    || searchable.includes('public')
  ) {
    return 'update';
  }

  return check.priority === 'high' ? 'fix' : 'update';
};

export const getOwnerBusinessCheckActionLabel = (check: OwnerBusinessHealthCheck) =>
  OWNER_BUSINESS_SIGNAL_ACTION_LABELS[getOwnerBusinessCheckAction(check)];

export const getOwnerBusinessCheckOwnerMessage = (check: OwnerBusinessHealthCheck) => {
  const action = getOwnerBusinessCheckAction(check);

  if (action === 'restock') {
    return check.message.includes('unavailable')
      ? `${check.message} Restock them or hide them from the public menu.`
      : check.message;
  }

  if (check.id === 'low_latest_activity') {
    return 'Customer activity is low in the latest settled period. Update QR, Google, Instagram, WhatsApp, or website links.';
  }

  if (check.id === 'no_active_projects') {
    return 'No active public menu source was found. Update the menu source before sharing the menu.';
  }

  return check.message;
};
