export type MyCodexFounderConsoleProduct = 'shared' | 'menulist' | 'answerlattice';
export type MyCodexFounderConsoleGroup = 'overview' | 'product' | 'system' | 'advanced';

export type MyCodexFounderConsoleSurfaceKey =
    | 'ops-control-room'
    | 'founder-monitor'
    | 'scheduler-monitor'
    | 'extraction-monitor'
    | 'cost-posture'
    | 'business-health'
    | 'tenants'
    | 'stores'
    | 'users'
    | 'pricing-plans'
    | 'entity-blocks'
    | 'asset-templates'
    | 'messaging-onboarding'
    | 'owner-notifications'
    | 'platform-notifications'
    | 'report-leads'
    | 'website-enquiries'
    | 'answerlattice-early-access'
    | 'answerlattice-intake'
    | 'answerlattice-support-tickets'
    | 'answerlattice-feedback'
    | 'answerlattice-knowledge-base'
    | 'answerlattice-kb-generation'
    | 'answerlattice-changelog'
    | 'answerlattice-chat-management'
    | 'answerlattice-chat-insights'
    | 'answerlattice-chat-backfill'
    | 'answerlattice-weekly-digest'
    | 'answerlattice-roi-calculator'
    | 'answerlattice-widget'
    | 'sentry-testing';

export type MyCodexFounderConsoleRenderer =
    | 'mobile-ops'
    | 'mobile-scheduler'
    | 'mobile-extraction'
    | 'platform-internal'
    | 'sentry';

export interface MyCodexFounderConsoleSurface {
    description: string;
    developmentOnly?: boolean;
    group: MyCodexFounderConsoleGroup;
    key: MyCodexFounderConsoleSurfaceKey;
    legacyPath: string;
    mobilePriority?: boolean;
    product: MyCodexFounderConsoleProduct;
    renderer: MyCodexFounderConsoleRenderer;
    screenKey?: string;
    title: string;
}

export const MYCODEX_FOUNDER_CONSOLE_BASE_PATH = '/__mycodex/operations';

export const MYCODEX_FOUNDER_CONSOLE_SURFACES: readonly MyCodexFounderConsoleSurface[] = [
    { key: 'ops-control-room', title: 'Ops Control Room', description: 'Current safety state, adoption, integrity, and recent operational alerts.', product: 'shared', group: 'overview', renderer: 'mobile-ops', legacyPath: '/platform/ops-control-room', mobilePriority: true },
    { key: 'founder-monitor', title: 'Founder Monitor', description: 'Live stores, revenue movement, onboarding, support risk, and product truth.', product: 'shared', group: 'overview', renderer: 'platform-internal', screenKey: 'founderMonitor', legacyPath: '/platform/founder-monitor', mobilePriority: true },
    { key: 'scheduler-monitor', title: 'Scheduler Monitor', description: 'Scheduled task health, recent runs, results, and bounded recovery actions.', product: 'shared', group: 'system', renderer: 'mobile-scheduler', legacyPath: '/platform/scheduler-monitor', mobilePriority: true },
    { key: 'extraction-monitor', title: 'Extraction Monitor', description: 'Extraction health, quality, cost, and recent job outcomes.', product: 'shared', group: 'system', renderer: 'mobile-extraction', legacyPath: '/platform/extraction-monitor', mobilePriority: true },
    { key: 'cost-posture', title: 'Cost Posture', description: 'Paid-cost posture, guardrails, and expensive-operation signals.', product: 'shared', group: 'system', renderer: 'platform-internal', screenKey: 'costPosture', legacyPath: '/platform/cost-posture' },
    { key: 'business-health', title: 'Business Health Monitor', description: 'Owner questions, answers, support gaps, actions, and operating cost.', product: 'menulist', group: 'overview', renderer: 'platform-internal', screenKey: 'ownerBusinessAssistantMonitor', legacyPath: '/platform/owner-business-assistant', mobilePriority: true },
    { key: 'tenants', title: 'Tenants', description: 'Tenant accounts and tenant-level business records.', product: 'menulist', group: 'product', renderer: 'platform-internal', screenKey: 'platformTenants', legacyPath: '/platform/tenants' },
    { key: 'stores', title: 'Stores', description: 'Stores, outlets, and store-level business records.', product: 'menulist', group: 'product', renderer: 'platform-internal', screenKey: 'platformStores', legacyPath: '/platform/stores' },
    { key: 'users', title: 'Users', description: 'Verification, roles, tenant membership, and store access.', product: 'menulist', group: 'product', renderer: 'platform-internal', screenKey: 'platformUsers', legacyPath: '/platform/users' },
    { key: 'pricing-plans', title: 'Pricing Plans', description: 'MenuList plans, limits, and owner-facing commercial configuration.', product: 'menulist', group: 'product', renderer: 'platform-internal', screenKey: 'pricingPlans', legacyPath: '/platform/pricing-plans' },
    { key: 'entity-blocks', title: 'Entity Blocks', description: 'Block or unblock tenants, stores, and users with audit details.', product: 'menulist', group: 'advanced', renderer: 'platform-internal', screenKey: 'entityBlocks', legacyPath: '/platform/entity-blocks' },
    { key: 'asset-templates', title: 'Asset Templates', description: 'Print asset templates and business-category coverage.', product: 'menulist', group: 'advanced', renderer: 'platform-internal', screenKey: 'assetTemplates', legacyPath: '/platform/asset-templates' },
    { key: 'messaging-onboarding', title: 'Messaging Onboarding', description: 'Messaging onboarding sessions, preview fixes, and publish readiness.', product: 'menulist', group: 'system', renderer: 'platform-internal', screenKey: 'messagingOnboardingMonitor', legacyPath: '/ops/messaging-onboarding' },
    { key: 'owner-notifications', title: 'Owner Notifications', description: 'Owner notification templates and delivery operations.', product: 'menulist', group: 'system', renderer: 'platform-internal', screenKey: 'ownerNotificationMonitor', legacyPath: '/ops/owner-notifications' },
    { key: 'platform-notifications', title: 'Platform Notifications', description: 'Platform-wide notification templates and delivery operations.', product: 'menulist', group: 'system', renderer: 'platform-internal', screenKey: 'platformNotificationMonitor', legacyPath: '/ops/platform-notifications' },
    { key: 'report-leads', title: 'Report Leads', description: 'Review bounded lead submissions from MenuList report surfaces.', product: 'menulist', group: 'system', renderer: 'platform-internal', screenKey: 'reportLeadMonitor', legacyPath: '/ops/report-leads' },
    { key: 'website-enquiries', title: 'Website Enquiries', description: 'Review and manage MenuList website enquiries.', product: 'menulist', group: 'system', renderer: 'platform-internal', screenKey: 'websiteEnquiryMonitor', legacyPath: '/ops/website-enquiries' },
    { key: 'answerlattice-early-access', title: 'Early Access', description: 'Answerlattice access requests, feature ideas, and lifecycle status.', product: 'answerlattice', group: 'overview', renderer: 'platform-internal', screenKey: 'answerlatticeEarlyAccess', legacyPath: '/platform/answerlattice-early-access', mobilePriority: true },
    { key: 'answerlattice-intake', title: 'Knowledge Intake', description: 'Intake jobs, support-credit ledger, media extraction, and summary health.', product: 'answerlattice', group: 'product', renderer: 'platform-internal', screenKey: 'answerlatticeIntake', legacyPath: '/platform/answerlattice-intake' },
    { key: 'answerlattice-support-tickets', title: 'Support Tickets', description: 'Answerlattice platform support queue and ticket operations.', product: 'answerlattice', group: 'product', renderer: 'platform-internal', screenKey: 'supportTickets', legacyPath: '/platform/support-tickets' },
    { key: 'answerlattice-feedback', title: 'Feedback', description: 'Review internal and product feedback without crossing tenant boundaries.', product: 'answerlattice', group: 'product', renderer: 'platform-internal', screenKey: 'feedbackAdmin', legacyPath: '/platform/feedback-admin' },
    { key: 'answerlattice-knowledge-base', title: 'Knowledge Base', description: 'Edit, review, and publish governed support knowledge.', product: 'answerlattice', group: 'product', renderer: 'platform-internal', screenKey: 'knowledgeBase', legacyPath: '/platform/knowledge-base' },
    { key: 'answerlattice-kb-generation', title: 'KB Generation', description: 'Generate, review, and reconcile knowledge content.', product: 'answerlattice', group: 'product', renderer: 'platform-internal', screenKey: 'kbGeneration', legacyPath: '/platform/kb-generation' },
    { key: 'answerlattice-changelog', title: 'Changelog', description: 'Create and publish Answerlattice release notes.', product: 'answerlattice', group: 'product', renderer: 'platform-internal', screenKey: 'changelog', legacyPath: '/platform/changelog' },
    { key: 'answerlattice-chat-management', title: 'Chat Management', description: 'Review and manage customer support conversations.', product: 'answerlattice', group: 'product', renderer: 'platform-internal', screenKey: 'chatManagement', legacyPath: '/platform/chat-management' },
    { key: 'answerlattice-chat-insights', title: 'Chat Insights', description: 'Conversation analytics and answer-quality signals.', product: 'answerlattice', group: 'product', renderer: 'platform-internal', screenKey: 'chatInsights', legacyPath: '/platform/chat-insights' },
    { key: 'answerlattice-chat-backfill', title: 'Chat Backfill', description: 'Run governed analytics backfill operations.', product: 'answerlattice', group: 'advanced', renderer: 'platform-internal', screenKey: 'chatBackfill', legacyPath: '/platform/chat-backfill' },
    { key: 'answerlattice-weekly-digest', title: 'Weekly Digest', description: 'Review weekly support intelligence output.', product: 'answerlattice', group: 'product', renderer: 'platform-internal', screenKey: 'chatWeeklyDigest', legacyPath: '/platform/chat-weekly-digest' },
    { key: 'answerlattice-roi-calculator', title: 'ROI Calculator', description: 'Internal support-operation ROI calculator.', product: 'answerlattice', group: 'advanced', renderer: 'platform-internal', screenKey: 'chatRoiCalculator', legacyPath: '/platform/chat-roi-calculator' },
    { key: 'answerlattice-widget', title: 'Widget Management', description: 'Widget keys, install snippets, origins, appearance, and cache strategy.', product: 'answerlattice', group: 'product', renderer: 'platform-internal', screenKey: 'answerlatticeWidget', legacyPath: '/answerlattice/widget' },
    { key: 'sentry-testing', title: 'Sentry Testing', description: 'Development-only monitoring diagnostics.', product: 'shared', group: 'advanced', renderer: 'sentry', legacyPath: '/platform/test-sentry', developmentOnly: true },
] as const;

export function getMyCodexFounderConsoleSurface(
    key: string,
    options: { includeDevelopment?: boolean } = {},
): MyCodexFounderConsoleSurface | null {
    const surface = MYCODEX_FOUNDER_CONSOLE_SURFACES.find((candidate) => candidate.key === key);
    if (!surface) return null;
    if (surface.developmentOnly && !options.includeDevelopment) return null;
    return surface;
}

export function getMyCodexFounderConsoleVisibleSurfaces(
    options: { includeDevelopment?: boolean } = {},
): readonly MyCodexFounderConsoleSurface[] {
    return MYCODEX_FOUNDER_CONSOLE_SURFACES.filter((surface) => (
        !surface.developmentOnly || options.includeDevelopment === true
    ));
}
