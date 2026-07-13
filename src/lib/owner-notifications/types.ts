import type {
    OwnerNotificationChannel,
    OwnerNotificationPriority,
    OwnerNotificationProductId,
    OwnerNotificationRecipientRole,
} from '@data/shared/ownerNotificationRegistry';
import type { Timestamp } from 'firebase-admin/firestore';

export type OwnerNotificationRuntime = 'next' | 'functions' | 'functions-answerlattice';

export type OwnerNotificationEventStatus =
    | 'pending'
    | 'processing'
    | 'delivered'
    | 'partial'
    | 'failed'
    | 'skipped';

export type OwnerNotificationDeliveryStatus = 'sent' | 'failed' | 'skipped' | 'rate_limited';

export type OwnerNotificationRecipientHints = {
    email?: string;
    name?: string;
    whatsappNumber?: string;
};

export type EnqueueOwnerNotificationInput = {
    productId: OwnerNotificationProductId;
    triggerType: string;
    tenantId: string;
    storeId?: string;
    workspaceId?: string;
    referenceId: string;
    recipientRole?: OwnerNotificationRecipientRole;
    requestedChannels?: OwnerNotificationChannel[];
    recipientHints?: OwnerNotificationRecipientHints;
    metadata?: Record<string, unknown>;
    source: {
        runtime: OwnerNotificationRuntime;
        path: string;
    };
};

export type OwnerNotificationEventDoc = {
    productId: OwnerNotificationProductId;
    triggerType: string;
    tenantId: string;
    storeId?: string;
    workspaceId?: string;
    referenceId: string;
    dedupeKey: string;
    recipientRole: OwnerNotificationRecipientRole;
    requestedChannels?: OwnerNotificationChannel[];
    recipientHints?: OwnerNotificationRecipientHints;
    metadata: Record<string, unknown>;
    priority: OwnerNotificationPriority;
    status: OwnerNotificationEventStatus;
    source: {
        runtime: OwnerNotificationRuntime;
        path: string;
    };
    createdAt: Timestamp;
    updatedAt: Timestamp;
    processingStartedAt?: Timestamp;
    processingAttempt?: number;
    processedAt?: Timestamp;
    error?: string | null;
};

export type OwnerNotificationRecipient = {
    role: OwnerNotificationRecipientRole;
    email?: string;
    name?: string;
    whatsappNumber?: string;
    whatsappConsent: boolean;
};

export type OwnerNotificationFormattingContext = {
    locale: string;
    timeZone: string;
    dateFormat?: string;
    timeFormat?: string;
    currencyCode: string;
    currencySymbol: string;
};

export type OwnerNotificationScope = {
    readCount: number;
    storeData?: Record<string, any> | null;
    workspaceData?: Record<string, any> | null;
};

export type OwnerNotificationTemplate = {
    subject: string;
    html: string;
    text: string;
    templateKey: string;
    templateVersion: string;
};

export type OwnerNotificationChannelResult = {
    ok: boolean;
    providerMessageId?: string;
    error?: string;
    skippedReason?: string;
};

export type OwnerNotificationProcessResult = {
    eventId: string;
    status: OwnerNotificationEventStatus;
    sent: number;
    failed: number;
    skipped: number;
    created?: boolean;
    claimed?: boolean;
    claimReason?: 'not_found_or_product_mismatch' | 'not_claimable';
};
