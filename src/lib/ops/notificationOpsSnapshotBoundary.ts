import type { OwnerNotificationProductId } from '@data/shared/ownerNotificationRegistry';
import type {
  OwnerNotificationOpsEventStatus,
  OwnerNotificationOpsEventRow,
  OwnerNotificationOpsStatusFilter,
} from '@lib/ops/ownerNotificationTypes';
import type {
  PlatformNotificationRow,
  PlatformNotificationSeverityFilter,
  PlatformNotificationStatusFilter,
} from '@lib/ops/platformNotificationTypes';

const OWNER_NOTIFICATION_EVENT_STATUSES: OwnerNotificationOpsEventStatus[] = [
  'pending',
  'processing',
  'delivered',
  'partial',
  'failed',
  'skipped',
  'invalid',
];

function timestampMillis(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildPlatformNotificationWindow(params: {
  rows: PlatformNotificationRow[];
  status: PlatformNotificationStatusFilter;
  severity: PlatformNotificationSeverityFilter;
  triggerType: string;
  limit: number;
}): {
  counts: {
    active: number;
    acknowledged: number;
    critical: number;
    warning: number;
    info: number;
  };
  events: PlatformNotificationRow[];
} {
  const recentRows = [...params.rows]
    .sort((left, right) => timestampMillis(right.timestamp) - timestampMillis(left.timestamp));

  const counts = recentRows.reduce((acc, row) => {
    if (row.acknowledged) acc.acknowledged += 1;
    else acc.active += 1;
    acc[row.severity] += 1;
    return acc;
  }, {
    active: 0,
    acknowledged: 0,
    critical: 0,
    warning: 0,
    info: 0,
  });

  const events = recentRows
    .filter((row) => (
      params.status === 'all'
      || (params.status === 'active' ? !row.acknowledged : row.acknowledged)
    ))
    .filter((row) => params.severity === 'all' || row.severity === params.severity)
    .filter((row) => params.triggerType === 'all' || row.triggerType === params.triggerType)
    .slice(0, params.limit);

  return { counts, events };
}

export function buildOwnerNotificationWindow(params: {
  rows: OwnerNotificationOpsEventRow[];
  productId: OwnerNotificationProductId;
  status: OwnerNotificationOpsStatusFilter;
  limit: number;
}): {
  counts: Record<OwnerNotificationOpsEventStatus, number>;
  events: OwnerNotificationOpsEventRow[];
} {
  const productRows = params.rows
    .filter((row) => row.productId === params.productId)
    .sort((left, right) => timestampMillis(right.updatedAt) - timestampMillis(left.updatedAt));

  const counts = OWNER_NOTIFICATION_EVENT_STATUSES.reduce<Record<OwnerNotificationOpsEventStatus, number>>(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {
      pending: 0,
      processing: 0,
      delivered: 0,
      partial: 0,
      failed: 0,
      skipped: 0,
      invalid: 0,
    },
  );
  productRows.forEach((row) => {
    counts[row.status] += 1;
  });

  const events = productRows
    .filter((row) => params.status === 'all' || row.status === params.status)
    .slice(0, params.limit);

  return { counts, events };
}
