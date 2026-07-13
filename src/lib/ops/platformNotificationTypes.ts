import type {
  PlatformNotificationCategory,
  PlatformNotificationChannel,
  PlatformNotificationProductId,
  PlatformNotificationSeverity,
} from '@data/shared/platformNotificationRegistry';

export type PlatformNotificationStatusFilter = 'active' | 'acknowledged' | 'all';
export type PlatformNotificationSeverityFilter = PlatformNotificationSeverity | 'all';

export interface PlatformNotificationRow {
  id: string;
  triggerType: string;
  productId: PlatformNotificationProductId;
  category: PlatformNotificationCategory;
  severity: PlatformNotificationSeverity;
  title: string;
  message: string;
  tId: string;
  sId: string;
  acknowledged: boolean;
  actionRequired: boolean;
  actionTaken: boolean;
  timestamp: string | null;
  acknowledgedAt?: string | null;
  manualHandoffAt?: string | null;
  manualHandoffChannel?: 'email' | 'whatsapp_web' | null;
  metadataPreview: Record<string, string | number | boolean | null>;
  channels: PlatformNotificationChannel[];
  runbook: string;
  immediate: boolean;
}

export interface PlatformNotificationOpsCost {
  authReads: number;
  alertReads: number;
  countQueries: number;
  writes: number;
  scanLimit: number;
  note: string;
}

export interface PlatformNotificationSnapshot {
  generatedAt: string;
  feature: {
    dashboardEnabled: boolean;
    accessModel: 'current_persisted_platform_user';
    realtimeListeners: false;
  };
  filters: {
    status: PlatformNotificationStatusFilter;
    severity: PlatformNotificationSeverityFilter;
    triggerType: string;
    limit: number;
    scanLimit: number;
  };
  counts: {
    active: number;
    acknowledged: number;
    critical: number;
    warning: number;
    info: number;
  };
  events: PlatformNotificationRow[];
  selectedEvent?: PlatformNotificationRow;
  registry: Array<{
    triggerType: string;
    productId: PlatformNotificationProductId;
    category: PlatformNotificationCategory;
    severity: PlatformNotificationSeverity;
    title: string;
    description: string;
    defaultChannels: PlatformNotificationChannel[];
    immediate: boolean;
    runbook: string;
  }>;
  cost: PlatformNotificationOpsCost;
}

export interface PlatformNotificationActionResult {
  ok: boolean;
  action: 'acknowledge' | 'createManualAlert' | 'manualHandoff';
  eventId?: string;
  message: string;
}
