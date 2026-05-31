import type { AnswerlatticeProductSurfaceVisibility } from '@type/answerlattice';

export type AnswerlatticeSurfaceTemplate = {
    key: string;
    label: string;
    description: string;
    routePatterns: string[];
    feature: string;
    page: string;
    workflow: string;
    entityHints: string[];
    tags: string[];
    priority: number;
    visibility: AnswerlatticeProductSurfaceVisibility;
    starterQuestions: string[];
    draftPrompt: string;
};

const defaultVisibility: AnswerlatticeProductSurfaceVisibility = {
    helpWidget: true,
    helpCenter: true,
    changelog: true,
};

export const ANSWERLATTICE_SURFACE_TEMPLATES: AnswerlatticeSurfaceTemplate[] = [
    {
        key: 'billing_invoices',
        label: 'Billing and invoices',
        description: 'Plan changes, failed invoices, payment method updates, refunds, taxes, and renewal questions.',
        routePatterns: ['/billing', '/billing/*', '/settings/billing'],
        feature: 'billing',
        page: 'invoices',
        workflow: 'manage_subscription',
        entityHints: ['invoice', 'subscription', 'payment_method', 'plan'],
        tags: ['billing', 'invoice', 'subscription'],
        priority: 950,
        visibility: defaultVisibility,
        starterQuestions: [
            'Why did my invoice fail?',
            'How do I update my payment method?',
            'What happens when I change plans?',
        ],
        draftPrompt: 'Create approved answers for failed invoices, payment updates, renewals, refunds, and plan changes.',
    },
    {
        key: 'onboarding_import',
        label: 'Onboarding and import',
        description: 'First-run setup, imports, CSV/document uploads, processing states, and launch readiness.',
        routePatterns: ['/onboarding', '/onboarding/*', '/import', '/setup/*'],
        feature: 'onboarding',
        page: 'import',
        workflow: 'first_setup',
        entityHints: ['import', 'setup', 'workspace', 'processing'],
        tags: ['onboarding', 'import', 'setup'],
        priority: 940,
        visibility: defaultVisibility,
        starterQuestions: [
            'Why did my import stop?',
            'What files can I upload?',
            'What should I do before launch?',
        ],
        draftPrompt: 'Create approved answers for first setup, import failures, source file expectations, and launch checklist blockers.',
    },
    {
        key: 'team_settings',
        label: 'Team settings',
        description: 'Invites, roles, permissions, ownership, account switching, and workspace access issues.',
        routePatterns: ['/settings/team', '/team', '/team/*', '/members/*'],
        feature: 'team',
        page: 'settings',
        workflow: 'manage_team_access',
        entityHints: ['role', 'permission', 'invite', 'member'],
        tags: ['team', 'settings', 'permissions'],
        priority: 900,
        visibility: defaultVisibility,
        starterQuestions: [
            'Why can I not invite this user?',
            'Which role should I choose?',
            'How do I remove a team member?',
        ],
        draftPrompt: 'Create approved answers for invites, user roles, permissions, account access, and owner-only actions.',
    },
    {
        key: 'release_changes',
        label: 'Releases and usage changes',
        description: 'Recently shipped changes, limits, plan behavior, deprecated flows, and feature availability.',
        routePatterns: ['/updates', '/changelog', '/releases', '/usage/*'],
        feature: 'releases',
        page: 'changes',
        workflow: 'understand_recent_change',
        entityHints: ['release', 'limit', 'feature', 'usage'],
        tags: ['release', 'changelog', 'usage'],
        priority: 880,
        visibility: defaultVisibility,
        starterQuestions: [
            'Why did this limit change?',
            'What changed in the latest release?',
            'Is this feature available on my plan?',
        ],
        draftPrompt: 'Create approved answers that connect release notes to affected pages, limits, plans, and user-facing changes.',
    },
    {
        key: 'integrations_setup',
        label: 'Integrations setup',
        description: 'Connecting third-party services, webhooks, notification channels, OAuth, and broken integration states.',
        routePatterns: ['/integrations', '/integrations/*', '/settings/integrations'],
        feature: 'integrations',
        page: 'setup',
        workflow: 'connect_integration',
        entityHints: ['integration', 'webhook', 'oauth', 'notification'],
        tags: ['integrations', 'webhook', 'setup'],
        priority: 860,
        visibility: defaultVisibility,
        starterQuestions: [
            'Why is my integration not connecting?',
            'Where do I find the webhook URL?',
            'Which events should I enable?',
        ],
        draftPrompt: 'Create approved answers for connecting integrations, webhook setup, OAuth failures, and notification delivery checks.',
    },
    {
        key: 'common_errors',
        label: 'Common errors',
        description: 'Known error states, failed actions, permission warnings, empty states, and recoverable product problems.',
        routePatterns: ['/error', '/errors/*', '/status', '/troubleshooting/*'],
        feature: 'errors',
        page: 'troubleshooting',
        workflow: 'recover_from_error',
        entityHints: ['error', 'failure', 'status', 'recovery'],
        tags: ['errors', 'troubleshooting', 'status'],
        priority: 840,
        visibility: defaultVisibility,
        starterQuestions: [
            'Why did this action fail?',
            'What should I try first?',
            'When should I open a ticket?',
        ],
        draftPrompt: 'Create approved answers for known failures, retry steps, escalation paths, and safe user recovery.',
    },
];
