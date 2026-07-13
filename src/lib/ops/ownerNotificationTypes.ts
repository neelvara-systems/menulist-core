import type {
  OwnerNotificationChannel,
  OwnerNotificationProductId,
  OwnerNotificationRecipientRole,
} from '@data/shared/ownerNotificationRegistry';
import type {
  OwnerNotificationDeliveryStatus,
  OwnerNotificationEventStatus,
} from '@lib/owner-notifications/types';

export type OwnerNotificationOpsEventStatus = OwnerNotificationEventStatus | 'invalid';
export type OwnerNotificationOpsDeliveryStatus = OwnerNotificationDeliveryStatus | 'invalid';
export type OwnerNotificationOpsRecipientRole = OwnerNotificationRecipientRole | 'invalid';
export type OwnerNotificationOpsChannel = OwnerNotificationChannel | 'invalid';
export type OwnerNotificationOpsStatusFilter = OwnerNotificationOpsEventStatus | 'all';

export interface OwnerNotificationOpsEventRow {
  id: string;
  productId: OwnerNotificationProductId;
  triggerType: string;
  tenantId: string;
  storeId?: string;
  workspaceId?: string;
  referenceId: string;
  recipientRole: OwnerNotificationOpsRecipientRole;
  requestedChannels: OwnerNotificationChannel[];
  priority: string;
  status: OwnerNotificationOpsEventStatus;
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
  channel: OwnerNotificationOpsChannel;
  recipientRole: OwnerNotificationOpsRecipientRole;
  recipientMasked: string;
  status: OwnerNotificationOpsDeliveryStatus;
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
  authReads: number;
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
    accessModel: 'current_persisted_platform_user';
    realtimeListeners: false;
    productId: OwnerNotificationProductId;
  };
  filters: {
    productId: OwnerNotificationProductId;
    status: OwnerNotificationOpsStatusFilter;
    limit: number;
    scanLimit: number;
  };
  counts: Record<OwnerNotificationOpsEventStatus, number>;
  events: OwnerNotificationOpsEventRow[];
  selectedEvent?: OwnerNotificationOpsEventRow;
  deliveries?: OwnerNotificationOpsDeliveryRow[];
  resolvedRecipient?: OwnerNotificationOpsRecipient;
  manualTemplate?: OwnerNotificationOpsManualTemplate;
  detailError?: 'recipient_resolution_failed';
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
  replayed?: boolean;
  message: string;
}
