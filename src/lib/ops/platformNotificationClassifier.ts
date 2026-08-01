import {
  getPlatformNotificationRegistryEntry,
  PLATFORM_NOTIFICATION_TRIGGER_TYPES,
  type PlatformNotificationCategory,
  type PlatformNotificationProductId,
  type PlatformNotificationRegistryEntry,
  type PlatformNotificationSeverity,
} from '@data/shared/platformNotificationRegistry';

type RawAlert = {
  title?: unknown;
  message?: unknown;
  severity?: unknown;
  type?: unknown;
  tId?: unknown;
  sId?: unknown;
  metadata?: Record<string, unknown>;
};

const PLATFORM_NOTIFICATION_PRODUCT_IDS = new Set<PlatformNotificationProductId>([
  'PLATFORM',
  'ML',
  'AL',
  'CC',
  'MC',
]);
const PLATFORM_NOTIFICATION_CATEGORIES = new Set<PlatformNotificationCategory>([
  'cost',
  'security',
  'public_output',
  'scheduler',
  'payments',
  'owner_notifications',
  'ai',
  'extraction',
  'pos',
  'answerlattice',
  'manual',
  'system',
]);

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeSeverity(
  value: unknown,
  fallback: PlatformNotificationSeverity,
): PlatformNotificationSeverity {
  return value === 'critical' || value === 'warning' || value === 'info' ? value : fallback;
}

function normalizeProductId(
  value: unknown,
  fallback: PlatformNotificationProductId,
): PlatformNotificationProductId {
  return PLATFORM_NOTIFICATION_PRODUCT_IDS.has(value as PlatformNotificationProductId)
    ? value as PlatformNotificationProductId
    : fallback;
}

function normalizeCategory(
  value: unknown,
  fallback: PlatformNotificationCategory,
): PlatformNotificationCategory {
  return PLATFORM_NOTIFICATION_CATEGORIES.has(value as PlatformNotificationCategory)
    ? value as PlatformNotificationCategory
    : fallback;
}

function inferTriggerType(alert: RawAlert): string {
  const metadataTrigger = asText(alert.metadata?.platformTriggerType || alert.metadata?.triggerType || alert.metadata?.ruleId);
  if (metadataTrigger && getPlatformNotificationRegistryEntry(metadataTrigger)) return metadataTrigger;

  const haystack = `${asText(alert.title)} ${asText(alert.message)} ${asText(alert.type)} ${JSON.stringify(alert.metadata || {})}`.toLowerCase();

  if (haystack.includes('safe_mode') || haystack.includes('safe mode')) {
    return haystack.includes('deactivated')
      ? PLATFORM_NOTIFICATION_TRIGGER_TYPES.SAFE_MODE_DEACTIVATED
      : PLATFORM_NOTIFICATION_TRIGGER_TYPES.SAFE_MODE_ACTIVATED;
  }
  if (haystack.includes('budget')) return PLATFORM_NOTIFICATION_TRIGGER_TYPES.GCP_BUDGET_ALERT;
  if (haystack.includes('publish verification') || haystack.includes('verify publish')) {
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.PUBLISH_VERIFICATION_FAILED;
  }
  if (haystack.includes('public menu') || haystack.includes('client route') || haystack.includes('obp')) {
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.PUBLIC_MENU_FAILURE;
  }
  if (haystack.includes('scheduler') || haystack.includes('maintenance')) {
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.SCHEDULER_FAILURE;
  }
  if (haystack.includes('still unresolved') || haystack.includes('unacknowledged')) {
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.UNRESOLVED_CRITICAL_ALERT;
  }
  if (haystack.includes('razorpay') || haystack.includes('webhook') || haystack.includes('payment')) {
    if (haystack.includes('failed') || haystack.includes('halted') || haystack.includes('pending')) {
      return PLATFORM_NOTIFICATION_TRIGGER_TYPES.PAYMENT_FAILURE;
    }
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.PAYMENT_WEBHOOK_FAILURE;
  }
  if (haystack.includes('owner notification')) {
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.OWNER_NOTIFICATION_FAILURE;
  }
  if (haystack.includes('email provider') || haystack.includes('smtp')) {
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.EMAIL_PROVIDER_FAILURE;
  }
  if (haystack.includes('whatsapp')) {
    return haystack.includes('onboarding') || haystack.includes('intake')
      ? PLATFORM_NOTIFICATION_TRIGGER_TYPES.WHATSAPP_ONBOARDING_QUEUE_STUCK
      : PLATFORM_NOTIFICATION_TRIGGER_TYPES.WHATSAPP_PROVIDER_FAILURE;
  }
  if (haystack.includes('tenant access') || haystack.includes('authorization') || haystack.includes('signature') || haystack.includes('security')) {
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.SECURITY_CRITICAL;
  }
  if (haystack.includes('ai accounting') || haystack.includes('credit deduction')) {
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.AI_ACCOUNTING_FAILURE;
  }
  if (haystack.includes('ai cost') || haystack.includes('cost spike')) {
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.AI_COST_RUNAWAY;
  }
  if (haystack.includes('extraction')) {
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.EXTRACTION_FAILURE_SPIKE;
  }
  if (haystack.includes('stuck')) {
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.JOB_STUCK;
  }
  if (haystack.includes('pos')) {
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.POS_SYNC_FAILURE;
  }
  if (haystack.includes('answerlattice') && haystack.includes('coverage')) {
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.ANSWERLATTICE_COVERAGE_CRITICAL;
  }
  if (haystack.includes('answerlattice') && haystack.includes('widget')) {
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.ANSWERLATTICE_WIDGET_FAILURE;
  }
  if (haystack.includes('answerlattice') && haystack.includes('integration')) {
    return PLATFORM_NOTIFICATION_TRIGGER_TYPES.ANSWERLATTICE_INTEGRATION_FAILURE;
  }

  return PLATFORM_NOTIFICATION_TRIGGER_TYPES.UNKNOWN_SYSTEM_ALERT;
}

export function classifyPlatformAlert(alert: RawAlert): {
  triggerType: string;
  entry: PlatformNotificationRegistryEntry;
  productId: PlatformNotificationProductId;
  category: PlatformNotificationCategory;
  severity: PlatformNotificationSeverity;
} {
  const triggerType = inferTriggerType(alert);
  const entry = getPlatformNotificationRegistryEntry(triggerType)
    || getPlatformNotificationRegistryEntry(PLATFORM_NOTIFICATION_TRIGGER_TYPES.UNKNOWN_SYSTEM_ALERT)!;

  return {
    triggerType: entry.triggerType,
    entry,
    productId: normalizeProductId(alert.metadata?.productId, entry.productId),
    category: normalizeCategory(alert.metadata?.category, entry.category),
    severity: normalizeSeverity(alert.severity, entry.severity),
  };
}
