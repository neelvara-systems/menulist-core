import type {
  OwnerNotificationChannel,
  OwnerNotificationProductId,
  OwnerNotificationRecipientRole,
} from '@data/shared/ownerNotificationRegistry';
import type {
  OwnerNotificationDeliveryStatus,
  OwnerNotificationEventStatus,
} from '@lib/owner-notifications/types';

export type OwnerNotificationOpsStatusFilter = OwnerNotificationEventStatus | 'all';

export interface OwnerNotificationOpsEventRow {
  id: string;
  productId: OwnerNotificationProductId;
  triggerType: string;
  tenantId: string;
  storeId?: string;
  workspaceId?: string;
  referenceId: string;
  recipientRole: OwnerNotificationRecipientRole;
  requestedChannels: OwnerNotificationChannel[];
  priority: string;
  status: OwnerNotificationEventStatus;
  sourcePath: string;
  error?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  processedAt: string | null;
  manualHandoffAt?: string | null;
  manualHandoffChannel?: OwnerNotificationChannel | null;
  metadataPreview: Record<string, string | number | boolean | null>;
}

export interface OwnerNotificationOpsDeliveryRow {
  id: string;
  eventId: string;
  productId: OwnerNotificationProductId;
  triggerType: string;
  channel: OwnerNotificationChannel;
  recipientRole: OwnerNotificationRecipientRole;
  recipientMasked: string;
  status: OwnerNotificationDeliveryStatus;
  subject?: string | null;
  templateKey: string;
  templateVersion: string;
  providerMessageId?: string | null;
  error?: string | null;
  attempt: number;
  createdAt: string | null;
  sentAt: string | null;
  deliveryMode?: 'system' | 'manual_handoff';
}

export interface OwnerNotificationOpsRecipient {
  role: OwnerNotificationRecipientRole;
  name?: string;
  email?: string;
  whatsappNumber?: string;
  whatsappConsent: boolean;
}

export interface OwnerNotificationOpsManualTemplate {
  subject: string;
  text: string;
  templateKey: string;
  templateVersion: string;
}

export interface OwnerNotificationOpsCost {
  eventReads: number;
  deliveryReads: number;
  scopeReads: number;
  countQueries: number;
  writes: number;
  scanLimit: number;
  note: string;
}

export interface OwnerNotificationOpsSnapshot {
  generatedAt: string;
  feature: {
    dashboardEnabled: boolean;
    accessModel: 'platform_role';
    realtimeListeners: false;
    productId: OwnerNotificationProductId;
  };
  filters: {
    productId: OwnerNotificationProductId;
    status: OwnerNotificationOpsStatusFilter;
    limit: number;
    scanLimit: number;
  };
  counts: Record<OwnerNotificationEventStatus, number>;
  events: OwnerNotificationOpsEventRow[];
  selectedEvent?: OwnerNotificationOpsEventRow;
  deliveries?: OwnerNotificationOpsDeliveryRow[];
  resolvedRecipient?: OwnerNotificationOpsRecipient;
  manualTemplate?: OwnerNotificationOpsManualTemplate;
  cost: OwnerNotificationOpsCost;
}

export interface OwnerNotificationOpsActionResult {
  ok: boolean;
  action: 'retry' | 'manualSend' | 'manualHandoff';
  eventId: string;
  status?: OwnerNotificationEventStatus;
  sent?: number;
  failed?: number;
  skipped?: number;
  manualEventId?: string;
  message: string;
}
