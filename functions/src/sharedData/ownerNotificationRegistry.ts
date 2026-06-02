/**
 * Shared owner notification trigger registry.
 *
 * Self-contained by design. This file is mirrored byte-for-byte into
 * functions/src/sharedData/ownerNotificationRegistry.ts.
 *
 * @see __docs__/owner-notifications/
 */

export type OwnerNotificationProductId = 'ML' | 'AL';
export type OwnerNotificationChannel = 'email' | 'whatsapp';
export type OwnerNotificationPriority = 'critical' | 'required' | 'advisory' | 'conversational';
export type OwnerNotificationRecipientRole =
  | 'primary_owner'
  | 'billing_owner'
  | 'support_owner'
  | 'whatsapp_owner';
export type OwnerNotificationDedupeStrategy = 'per_reference' | 'per_day' | 'per_state_transition';
export type OwnerNotificationQuietHoursPolicy = 'respect' | 'bypass';

export type OwnerNotificationRegistryEntry = {
  productId: OwnerNotificationProductId;
  triggerType: string;
  priority: OwnerNotificationPriority;
  defaultChannels: OwnerNotificationChannel[];
  recipientRole: OwnerNotificationRecipientRole;
  dedupeStrategy: OwnerNotificationDedupeStrategy;
  quietHours: OwnerNotificationQuietHoursPolicy;
  requiresWhatsAppConsent: boolean;
  templateKey: string;
  requiredMetadata: string[];
};

export const OWNER_NOTIFICATION_COLLECTIONS = {
  EVENTS: 'ownerNotificationEvents',
  DELIVERIES: 'ownerNotificationDeliveries',
  RATE_LIMITS: 'ownerNotificationRateLimits',
} as const;

export const OWNER_NOTIFICATION_TRIGGER_TYPES = {
  MENU_PUBLISHED: 'MENU_PUBLISHED',
  STORE_PUBLISHED: 'STORE_PUBLISHED',
  MENU_PUBLISH_FAILED: 'MENU_PUBLISH_FAILED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  GRACE_PERIOD_STARTED: 'GRACE_PERIOD_STARTED',
  RENEWAL_REMINDER: 'RENEWAL_REMINDER',
  SUSPENSION_WARNING: 'SUSPENSION_WARNING',
  CREDIT_PURCHASE_SUCCESS: 'CREDIT_PURCHASE_SUCCESS',
  CREDITS_LOW: 'CREDITS_LOW',
  CREDITS_EXHAUSTED: 'CREDITS_EXHAUSTED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_PAUSED: 'SUBSCRIPTION_PAUSED',
  SUBSCRIPTION_RESUMED: 'SUBSCRIPTION_RESUMED',
  SUBSCRIPTION_UPGRADED: 'SUBSCRIPTION_UPGRADED',
  MENU_STALE: 'MENU_STALE',
  WHATSAPP_INTAKE_STARTED: 'WHATSAPP_INTAKE_STARTED',
  WHATSAPP_INTAKE_PROGRESS: 'WHATSAPP_INTAKE_PROGRESS',
  WHATSAPP_PREVIEW_READY: 'WHATSAPP_PREVIEW_READY',
  WHATSAPP_FIX_REQUEST_ACKNOWLEDGED: 'WHATSAPP_FIX_REQUEST_ACKNOWLEDGED',
  WHATSAPP_PUBLISHED: 'WHATSAPP_PUBLISHED',
  WHATSAPP_RATE_LIMITED: 'WHATSAPP_RATE_LIMITED',
  WHATSAPP_UPLOAD_HELP_NEEDED: 'WHATSAPP_UPLOAD_HELP_NEEDED',
  ANSWERLATTICE_NOTIFICATION_TEST: 'ANSWERLATTICE_NOTIFICATION_TEST',
  SUPPORT_EMAIL_MISSING: 'SUPPORT_EMAIL_MISSING',
  WIDGET_CONNECTION_VERIFIED: 'WIDGET_CONNECTION_VERIFIED',
  WIDGET_CONNECTION_FAILED: 'WIDGET_CONNECTION_FAILED',
  SOURCE_SYNC_FAILED: 'SOURCE_SYNC_FAILED',
  CANONICAL_APPROVAL_REQUIRED: 'CANONICAL_APPROVAL_REQUIRED',
  HIGH_PRIORITY_ESCALATION: 'HIGH_PRIORITY_ESCALATION',
} as const;

export const OWNER_NOTIFICATION_REGISTRY: OwnerNotificationRegistryEntry[] = [
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.MENU_PUBLISHED,
    priority: 'required',
    defaultChannels: ['email'],
    recipientRole: 'primary_owner',
    dedupeStrategy: 'per_reference',
    quietHours: 'respect',
    requiresWhatsAppConsent: false,
    templateKey: 'menulist.menu_published',
    requiredMetadata: [],
  },
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.STORE_PUBLISHED,
    priority: 'required',
    defaultChannels: ['email'],
    recipientRole: 'primary_owner',
    dedupeStrategy: 'per_reference',
    quietHours: 'respect',
    requiresWhatsAppConsent: false,
    templateKey: 'menulist.menu_published',
    requiredMetadata: [],
  },
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.MENU_PUBLISH_FAILED,
    priority: 'critical',
    defaultChannels: ['email', 'whatsapp'],
    recipientRole: 'primary_owner',
    dedupeStrategy: 'per_reference',
    quietHours: 'bypass',
    requiresWhatsAppConsent: true,
    templateKey: 'menulist.menu_publish_failed',
    requiredMetadata: [],
  },
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.PAYMENT_SUCCESS,
    priority: 'required',
    defaultChannels: ['email'],
    recipientRole: 'billing_owner',
    dedupeStrategy: 'per_reference',
    quietHours: 'respect',
    requiresWhatsAppConsent: false,
    templateKey: 'menulist.payment_success',
    requiredMetadata: [],
  },
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.PAYMENT_FAILED,
    priority: 'critical',
    defaultChannels: ['email', 'whatsapp'],
    recipientRole: 'billing_owner',
    dedupeStrategy: 'per_reference',
    quietHours: 'bypass',
    requiresWhatsAppConsent: true,
    templateKey: 'menulist.payment_failed',
    requiredMetadata: [],
  },
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.GRACE_PERIOD_STARTED,
    priority: 'critical',
    defaultChannels: ['email', 'whatsapp'],
    recipientRole: 'billing_owner',
    dedupeStrategy: 'per_reference',
    quietHours: 'bypass',
    requiresWhatsAppConsent: true,
    templateKey: 'menulist.grace_period_started',
    requiredMetadata: [],
  },
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.RENEWAL_REMINDER,
    priority: 'required',
    defaultChannels: ['email'],
    recipientRole: 'billing_owner',
    dedupeStrategy: 'per_day',
    quietHours: 'respect',
    requiresWhatsAppConsent: false,
    templateKey: 'menulist.renewal_reminder',
    requiredMetadata: [],
  },
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.SUSPENSION_WARNING,
    priority: 'critical',
    defaultChannels: ['email', 'whatsapp'],
    recipientRole: 'billing_owner',
    dedupeStrategy: 'per_day',
    quietHours: 'bypass',
    requiresWhatsAppConsent: true,
    templateKey: 'menulist.suspension_warning',
    requiredMetadata: [],
  },
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.CREDIT_PURCHASE_SUCCESS,
    priority: 'required',
    defaultChannels: ['email'],
    recipientRole: 'billing_owner',
    dedupeStrategy: 'per_reference',
    quietHours: 'respect',
    requiresWhatsAppConsent: false,
    templateKey: 'menulist.credit_purchase_success',
    requiredMetadata: [],
  },
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.CREDITS_LOW,
    priority: 'advisory',
    defaultChannels: ['email'],
    recipientRole: 'primary_owner',
    dedupeStrategy: 'per_day',
    quietHours: 'respect',
    requiresWhatsAppConsent: false,
    templateKey: 'menulist.credits_low',
    requiredMetadata: [],
  },
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.CREDITS_EXHAUSTED,
    priority: 'critical',
    defaultChannels: ['email', 'whatsapp'],
    recipientRole: 'primary_owner',
    dedupeStrategy: 'per_day',
    quietHours: 'bypass',
    requiresWhatsAppConsent: true,
    templateKey: 'menulist.credits_exhausted',
    requiredMetadata: [],
  },
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.SUBSCRIPTION_CANCELLED,
    priority: 'required',
    defaultChannels: ['email'],
    recipientRole: 'billing_owner',
    dedupeStrategy: 'per_state_transition',
    quietHours: 'respect',
    requiresWhatsAppConsent: false,
    templateKey: 'menulist.subscription_cancelled',
    requiredMetadata: [],
  },
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.SUBSCRIPTION_PAUSED,
    priority: 'required',
    defaultChannels: ['email'],
    recipientRole: 'billing_owner',
    dedupeStrategy: 'per_state_transition',
    quietHours: 'respect',
    requiresWhatsAppConsent: false,
    templateKey: 'menulist.subscription_paused',
    requiredMetadata: [],
  },
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.SUBSCRIPTION_RESUMED,
    priority: 'required',
    defaultChannels: ['email'],
    recipientRole: 'billing_owner',
    dedupeStrategy: 'per_state_transition',
    quietHours: 'respect',
    requiresWhatsAppConsent: false,
    templateKey: 'menulist.subscription_resumed',
    requiredMetadata: [],
  },
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.SUBSCRIPTION_UPGRADED,
    priority: 'required',
    defaultChannels: ['email'],
    recipientRole: 'billing_owner',
    dedupeStrategy: 'per_state_transition',
    quietHours: 'respect',
    requiresWhatsAppConsent: false,
    templateKey: 'menulist.subscription_upgraded',
    requiredMetadata: [],
  },
  {
    productId: 'ML',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.MENU_STALE,
    priority: 'advisory',
    defaultChannels: ['email'],
    recipientRole: 'primary_owner',
    dedupeStrategy: 'per_day',
    quietHours: 'respect',
    requiresWhatsAppConsent: false,
    templateKey: 'menulist.menu_stale',
    requiredMetadata: [],
  },
  {
    productId: 'AL',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.ANSWERLATTICE_NOTIFICATION_TEST,
    priority: 'required',
    defaultChannels: ['email'],
    recipientRole: 'support_owner',
    dedupeStrategy: 'per_reference',
    quietHours: 'respect',
    requiresWhatsAppConsent: false,
    templateKey: 'answerlattice.notification_test',
    requiredMetadata: [],
  },
  {
    productId: 'AL',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.SUPPORT_EMAIL_MISSING,
    priority: 'critical',
    defaultChannels: ['email', 'whatsapp'],
    recipientRole: 'support_owner',
    dedupeStrategy: 'per_state_transition',
    quietHours: 'bypass',
    requiresWhatsAppConsent: true,
    templateKey: 'answerlattice.support_email_missing',
    requiredMetadata: [],
  },
  {
    productId: 'AL',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.WIDGET_CONNECTION_VERIFIED,
    priority: 'required',
    defaultChannels: ['email'],
    recipientRole: 'support_owner',
    dedupeStrategy: 'per_reference',
    quietHours: 'respect',
    requiresWhatsAppConsent: false,
    templateKey: 'answerlattice.widget_connection_verified',
    requiredMetadata: [],
  },
  {
    productId: 'AL',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.WIDGET_CONNECTION_FAILED,
    priority: 'critical',
    defaultChannels: ['email', 'whatsapp'],
    recipientRole: 'support_owner',
    dedupeStrategy: 'per_reference',
    quietHours: 'bypass',
    requiresWhatsAppConsent: true,
    templateKey: 'answerlattice.widget_connection_failed',
    requiredMetadata: [],
  },
  {
    productId: 'AL',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.SOURCE_SYNC_FAILED,
    priority: 'critical',
    defaultChannels: ['email', 'whatsapp'],
    recipientRole: 'support_owner',
    dedupeStrategy: 'per_reference',
    quietHours: 'bypass',
    requiresWhatsAppConsent: true,
    templateKey: 'answerlattice.source_sync_failed',
    requiredMetadata: [],
  },
  {
    productId: 'AL',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.CANONICAL_APPROVAL_REQUIRED,
    priority: 'advisory',
    defaultChannels: ['email'],
    recipientRole: 'support_owner',
    dedupeStrategy: 'per_reference',
    quietHours: 'respect',
    requiresWhatsAppConsent: false,
    templateKey: 'answerlattice.canonical_approval_required',
    requiredMetadata: [],
  },
  {
    productId: 'AL',
    triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.HIGH_PRIORITY_ESCALATION,
    priority: 'critical',
    defaultChannels: ['email', 'whatsapp'],
    recipientRole: 'support_owner',
    dedupeStrategy: 'per_reference',
    quietHours: 'bypass',
    requiresWhatsAppConsent: true,
    templateKey: 'answerlattice.high_priority_escalation',
    requiredMetadata: [],
  },
];

export function getOwnerNotificationRegistryEntry(
  productId: OwnerNotificationProductId,
  triggerType: string,
): OwnerNotificationRegistryEntry | undefined {
  return OWNER_NOTIFICATION_REGISTRY.find((entry) => (
    entry.productId === productId && entry.triggerType === triggerType
  ));
}

export function isOwnerNotificationTrigger(
  productId: OwnerNotificationProductId,
  triggerType: string,
): boolean {
  return Boolean(getOwnerNotificationRegistryEntry(productId, triggerType));
}
