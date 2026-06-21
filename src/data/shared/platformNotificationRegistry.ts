/**
 * Shared platform notification trigger registry.
 *
 * Platform notifications are internal founder/operator alerts. They are not
 * owner notifications and not customer-facing messages.
 *
 * Self-contained by design so it can be mirrored into Cloud Functions when
 * Functions emitters migrate to the same registry.
 */

export type PlatformNotificationProductId = 'PLATFORM' | 'ML' | 'AL' | 'CC' | 'MC';
export type PlatformNotificationSeverity = 'info' | 'warning' | 'critical';
export type PlatformNotificationCategory =
  | 'cost'
  | 'security'
  | 'public_output'
  | 'scheduler'
  | 'payments'
  | 'owner_notifications'
  | 'ai'
  | 'extraction'
  | 'pos'
  | 'answerlattice'
  | 'manual'
  | 'system';
export type PlatformNotificationChannel = 'dashboard' | 'telegram' | 'email' | 'whatsapp_web';

export type PlatformNotificationRegistryEntry = {
  triggerType: string;
  productId: PlatformNotificationProductId;
  category: PlatformNotificationCategory;
  severity: PlatformNotificationSeverity;
  title: string;
  description: string;
  defaultChannels: PlatformNotificationChannel[];
  cooldownMinutes: number;
  immediate: boolean;
  runbook: string;
};

export const PLATFORM_NOTIFICATION_TRIGGER_TYPES = {
  SAFE_MODE_ACTIVATED: 'SAFE_MODE_ACTIVATED',
  SAFE_MODE_DEACTIVATED: 'SAFE_MODE_DEACTIVATED',
  GCP_BUDGET_ALERT: 'GCP_BUDGET_ALERT',
  PUBLIC_MENU_FAILURE: 'PUBLIC_MENU_FAILURE',
  PUBLISH_VERIFICATION_FAILED: 'PUBLISH_VERIFICATION_FAILED',
  SCHEDULER_FAILURE: 'SCHEDULER_FAILURE',
  DEAD_MAN_MISSING: 'DEAD_MAN_MISSING',
  UNRESOLVED_CRITICAL_ALERT: 'UNRESOLVED_CRITICAL_ALERT',
  PAYMENT_WEBHOOK_FAILURE: 'PAYMENT_WEBHOOK_FAILURE',
  PAYMENT_FAILURE: 'PAYMENT_FAILURE',
  PAYMENT_STATE_MISMATCH: 'PAYMENT_STATE_MISMATCH',
  OWNER_NOTIFICATION_FAILURE: 'OWNER_NOTIFICATION_FAILURE',
  EMAIL_PROVIDER_FAILURE: 'EMAIL_PROVIDER_FAILURE',
  WHATSAPP_PROVIDER_FAILURE: 'WHATSAPP_PROVIDER_FAILURE',
  SECURITY_CRITICAL: 'SECURITY_CRITICAL',
  AI_COST_RUNAWAY: 'AI_COST_RUNAWAY',
  AI_ACCOUNTING_FAILURE: 'AI_ACCOUNTING_FAILURE',
  EXTRACTION_FAILURE_SPIKE: 'EXTRACTION_FAILURE_SPIKE',
  JOB_STUCK: 'JOB_STUCK',
  WHATSAPP_ONBOARDING_QUEUE_STUCK: 'WHATSAPP_ONBOARDING_QUEUE_STUCK',
  POS_SYNC_FAILURE: 'POS_SYNC_FAILURE',
  ANSWERLATTICE_WIDGET_FAILURE: 'ANSWERLATTICE_WIDGET_FAILURE',
  ANSWERLATTICE_COVERAGE_CRITICAL: 'ANSWERLATTICE_COVERAGE_CRITICAL',
  ANSWERLATTICE_INTEGRATION_FAILURE: 'ANSWERLATTICE_INTEGRATION_FAILURE',
  MANUAL_PLATFORM_ALERT: 'MANUAL_PLATFORM_ALERT',
  UNKNOWN_SYSTEM_ALERT: 'UNKNOWN_SYSTEM_ALERT',
} as const;

const P0_CHANNELS: PlatformNotificationChannel[] = ['dashboard', 'telegram', 'email', 'whatsapp_web'];
const P1_CHANNELS: PlatformNotificationChannel[] = ['dashboard', 'telegram', 'email'];
const DASHBOARD_ONLY: PlatformNotificationChannel[] = ['dashboard'];

export const PLATFORM_NOTIFICATION_REGISTRY: PlatformNotificationRegistryEntry[] = [
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.SAFE_MODE_ACTIVATED,
    productId: 'PLATFORM',
    category: 'cost',
    severity: 'critical',
    title: 'SAFE_MODE activated',
    description: 'Cost protection or manual emergency switch has stopped expensive operations.',
    defaultChannels: P0_CHANNELS,
    cooldownMinutes: 5,
    immediate: true,
    runbook: '/ops then Cost Self-Protection runbook',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.SAFE_MODE_DEACTIVATED,
    productId: 'PLATFORM',
    category: 'cost',
    severity: 'warning',
    title: 'SAFE_MODE deactivated',
    description: 'Expensive operations were restored after manual review.',
    defaultChannels: P1_CHANNELS,
    cooldownMinutes: 5,
    immediate: true,
    runbook: '/ops then verify expensive-route health',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.GCP_BUDGET_ALERT,
    productId: 'PLATFORM',
    category: 'cost',
    severity: 'critical',
    title: 'GCP budget alert',
    description: 'Cloud budget threshold was crossed and cost containment needs review.',
    defaultChannels: P0_CHANNELS,
    cooldownMinutes: 10,
    immediate: true,
    runbook: 'Check GCP billing, SAFE_MODE, and recent AI/batch activity.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.PUBLIC_MENU_FAILURE,
    productId: 'ML',
    category: 'public_output',
    severity: 'critical',
    title: 'Public menu failure',
    description: 'Customer-facing menu, OBP, or client route is failing.',
    defaultChannels: P0_CHANNELS,
    cooldownMinutes: 10,
    immediate: true,
    runbook: 'Open the public URL, check cache invalidation, and verify latest publish state.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.PUBLISH_VERIFICATION_FAILED,
    productId: 'ML',
    category: 'public_output',
    severity: 'critical',
    title: 'Publish verification failed',
    description: 'A publish verification or public menu health check failed.',
    defaultChannels: P1_CHANNELS,
    cooldownMinutes: 15,
    immediate: true,
    runbook: '/ops force republish if the failure is confirmed.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.SCHEDULER_FAILURE,
    productId: 'PLATFORM',
    category: 'scheduler',
    severity: 'critical',
    title: 'Scheduler failure',
    description: 'A required maintenance, cleanup, scoring, or aggregation task failed.',
    defaultChannels: P0_CHANNELS,
    cooldownMinutes: 15,
    immediate: true,
    runbook: '/ops/scheduler and Functions logs.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.DEAD_MAN_MISSING,
    productId: 'PLATFORM',
    category: 'scheduler',
    severity: 'critical',
    title: 'Dead-man signal missing',
    description: 'Expected scheduler completion signal did not arrive.',
    defaultChannels: P0_CHANNELS,
    cooldownMinutes: 30,
    immediate: true,
    runbook: 'Check Cloud Scheduler, Functions invocations, and maintenance leases.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.UNRESOLVED_CRITICAL_ALERT,
    productId: 'PLATFORM',
    category: 'system',
    severity: 'critical',
    title: 'Unresolved critical alert',
    description: 'A critical alert remained unacknowledged past the escalation window.',
    defaultChannels: P0_CHANNELS,
    cooldownMinutes: 30,
    immediate: true,
    runbook: '/ops/platform-notifications and acknowledge after action.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.PAYMENT_WEBHOOK_FAILURE,
    productId: 'ML',
    category: 'payments',
    severity: 'critical',
    title: 'Payment webhook failure',
    description: 'Razorpay webhook verification, parsing, or state update failed.',
    defaultChannels: P0_CHANNELS,
    cooldownMinutes: 10,
    immediate: true,
    runbook: 'Check Razorpay webhook logs and subscription/payment documents.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.PAYMENT_FAILURE,
    productId: 'ML',
    category: 'payments',
    severity: 'warning',
    title: 'Payment failure',
    description: 'A payment failed, subscription halted, or payment retry needs platform review.',
    defaultChannels: P1_CHANNELS,
    cooldownMinutes: 10,
    immediate: true,
    runbook: 'Check Razorpay payment, subscription state, and owner billing status.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.PAYMENT_STATE_MISMATCH,
    productId: 'ML',
    category: 'payments',
    severity: 'critical',
    title: 'Payment state mismatch',
    description: 'Subscription, transaction, or owner access state does not agree.',
    defaultChannels: P1_CHANNELS,
    cooldownMinutes: 20,
    immediate: true,
    runbook: 'Compare subscription, payment transaction, and user/store state.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.OWNER_NOTIFICATION_FAILURE,
    productId: 'PLATFORM',
    category: 'owner_notifications',
    severity: 'warning',
    title: 'Owner notification failure',
    description: 'Owner notification delivery failed or was skipped for a critical event.',
    defaultChannels: P1_CHANNELS,
    cooldownMinutes: 15,
    immediate: true,
    runbook: '/ops/owner-notifications.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.EMAIL_PROVIDER_FAILURE,
    productId: 'PLATFORM',
    category: 'owner_notifications',
    severity: 'critical',
    title: 'Email provider failure',
    description: 'Email channel is unavailable or repeatedly failing.',
    defaultChannels: P0_CHANNELS,
    cooldownMinutes: 10,
    immediate: true,
    runbook: 'Check SMTP/provider credentials and owner notification deliveries.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.WHATSAPP_PROVIDER_FAILURE,
    productId: 'PLATFORM',
    category: 'owner_notifications',
    severity: 'critical',
    title: 'WhatsApp provider failure',
    description: 'WhatsApp channel is unavailable, blocked, or repeatedly failing.',
    defaultChannels: P0_CHANNELS,
    cooldownMinutes: 10,
    immediate: true,
    runbook: 'Check WhatsApp provider configuration and messaging onboarding monitor.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.SECURITY_CRITICAL,
    productId: 'PLATFORM',
    category: 'security',
    severity: 'critical',
    title: 'Critical security event',
    description: 'Tenant isolation, auth, webhook signature, or abuse signal needs immediate review.',
    defaultChannels: P0_CHANNELS,
    cooldownMinutes: 5,
    immediate: true,
    runbook: 'Check security logs, block entity if needed, and preserve evidence.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.AI_COST_RUNAWAY,
    productId: 'ML',
    category: 'ai',
    severity: 'critical',
    title: 'AI cost runaway',
    description: 'AI cost or batch activity exceeded the expected operating envelope.',
    defaultChannels: P0_CHANNELS,
    cooldownMinutes: 10,
    immediate: true,
    runbook: 'Enable SAFE_MODE if needed and inspect AI operation logs.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.AI_ACCOUNTING_FAILURE,
    productId: 'ML',
    category: 'ai',
    severity: 'critical',
    title: 'AI accounting failure',
    description: 'Billable AI output did not settle credits or accounting correctly.',
    defaultChannels: P0_CHANNELS,
    cooldownMinutes: 10,
    immediate: true,
    runbook: 'Check AI operation, credit transaction, and route logs.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.EXTRACTION_FAILURE_SPIKE,
    productId: 'ML',
    category: 'extraction',
    severity: 'warning',
    title: 'Extraction failure spike',
    description: 'Menu extraction or intake jobs are failing above normal levels.',
    defaultChannels: P1_CHANNELS,
    cooldownMinutes: 20,
    immediate: true,
    runbook: '/ops/extraction.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.JOB_STUCK,
    productId: 'ML',
    category: 'extraction',
    severity: 'warning',
    title: 'Job stuck',
    description: 'A queue job has stayed processing beyond the allowed window.',
    defaultChannels: P1_CHANNELS,
    cooldownMinutes: 20,
    immediate: true,
    runbook: '/ops/extraction or scheduler monitor.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.WHATSAPP_ONBOARDING_QUEUE_STUCK,
    productId: 'ML',
    category: 'extraction',
    severity: 'warning',
    title: 'WhatsApp onboarding queue stuck',
    description: 'Messaging onboarding queue is not draining or provider media is failing.',
    defaultChannels: P1_CHANNELS,
    cooldownMinutes: 20,
    immediate: true,
    runbook: '/ops/messaging-onboarding.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.POS_SYNC_FAILURE,
    productId: 'ML',
    category: 'pos',
    severity: 'warning',
    title: 'POS sync failure',
    description: 'POS webhook delivery, connector auth, or sync state failed repeatedly.',
    defaultChannels: P1_CHANNELS,
    cooldownMinutes: 20,
    immediate: true,
    runbook: 'Check POS sync route logs and store integration settings.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.ANSWERLATTICE_WIDGET_FAILURE,
    productId: 'AL',
    category: 'answerlattice',
    severity: 'critical',
    title: 'Answerlattice widget failure',
    description: 'Widget or hosted support runtime is failing.',
    defaultChannels: P1_CHANNELS,
    cooldownMinutes: 10,
    immediate: true,
    runbook: 'Check Answerlattice widget/search API logs.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.ANSWERLATTICE_COVERAGE_CRITICAL,
    productId: 'AL',
    category: 'answerlattice',
    severity: 'critical',
    title: 'Answerlattice coverage critical',
    description: 'Canonical answer or support coverage dropped below critical threshold.',
    defaultChannels: P1_CHANNELS,
    cooldownMinutes: 30,
    immediate: true,
    runbook: 'Open Answerlattice governance dashboard and coverage KPIs.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.ANSWERLATTICE_INTEGRATION_FAILURE,
    productId: 'AL',
    category: 'answerlattice',
    severity: 'warning',
    title: 'Answerlattice integration failure',
    description: 'Slack/email governance alert delivery failed repeatedly.',
    defaultChannels: P1_CHANNELS,
    cooldownMinutes: 20,
    immediate: true,
    runbook: 'Check Answerlattice workflow integration delivery logs.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.MANUAL_PLATFORM_ALERT,
    productId: 'PLATFORM',
    category: 'manual',
    severity: 'warning',
    title: 'Manual platform alert',
    description: 'Platform operator created a manual alert.',
    defaultChannels: P1_CHANNELS,
    cooldownMinutes: 0,
    immediate: true,
    runbook: '/ops/platform-notifications.',
  },
  {
    triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.UNKNOWN_SYSTEM_ALERT,
    productId: 'PLATFORM',
    category: 'system',
    severity: 'warning',
    title: 'Unclassified system alert',
    description: 'Existing alert without registry metadata.',
    defaultChannels: DASHBOARD_ONLY,
    cooldownMinutes: 0,
    immediate: false,
    runbook: 'Classify the source alert if it should page the platform owner.',
  },
];

export function getPlatformNotificationRegistryEntry(
  triggerType: string,
): PlatformNotificationRegistryEntry | undefined {
  return PLATFORM_NOTIFICATION_REGISTRY.find((entry) => entry.triggerType === triggerType);
}
