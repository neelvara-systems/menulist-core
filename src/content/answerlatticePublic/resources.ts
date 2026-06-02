import type { AnswerlatticeResourceGroup } from './types';

export const ANSWERLATTICE_RESOURCE_GROUPS: AnswerlatticeResourceGroup[] = [
    {
        title: 'Evaluate AnswerLattice',
        description: 'Start with proof, pricing, and common buying questions.',
        items: [
            { label: 'See the demo', href: '/demo', description: 'Watch how the answer changes by page.', eventName: 'resource_demo_clicked' },
            { label: 'Pricing', href: '/pricing', description: 'See the current Starter, Growth, and Studio packaging.', eventName: 'resource_pricing_clicked' },
            { label: 'ROI calculator', href: '/roi-calculator', description: 'Estimate repeated-question time saved and plan fit.', eventName: 'resource_roi_clicked' },
            { label: 'Proof pack', href: '/proof', description: 'Review example workloads for launch, release, and studio use.', eventName: 'resource_proof_clicked' },
            { label: 'FAQ', href: '/faq', description: 'Answers for setup, knowledge intake, widget context, screenshots, fallback, pricing, and data handling.', eventName: 'resource_faq_clicked' },
        ],
    },
    {
        title: 'Understand the fit',
        description: 'Match AnswerLattice to the support problem your product has today.',
        items: [
            { label: 'Use cases', href: '/use-cases', description: 'Map AnswerLattice to billing, onboarding, settings, releases, and tickets.', eventName: 'resource_use_cases_clicked' },
            { label: 'AI-built SaaS', href: '/use-cases/ai-built-saas', description: 'See the launch support path for apps built quickly with AI.', eventName: 'resource_ai_built_saas_clicked' },
            { label: 'Comparisons', href: '/comparisons', description: 'Compare AnswerLattice with generic chatbots, helpdesks, and knowledge bases without unsupported vendor claims.', eventName: 'resource_comparisons_clicked' },
            { label: 'Page-aware support widget', href: '/page-aware-support-widget', description: 'See how product-page context and optional screenshots change the answer.', eventName: 'resource_widget_clicked' },
        ],
    },
    {
        title: 'Plan the rollout',
        description: 'Check install, hosted help, runtime safety, and cost boundaries before implementation.',
        items: [
            { label: 'Pre-Onboarding Kit', href: '/pre-onboarding', description: 'Use your AI coding agent to prepare AnswerLattice-ready source inputs before setup.', eventName: 'resource_pre_onboarding_clicked' },
            { label: 'Pre-Onboarding Guide', href: '/pre-onboarding/guide', description: 'Follow the owner and agent runbook before uploading prepared sources.', eventName: 'resource_pre_onboarding_guide_clicked' },
            { label: 'Starter surface templates', href: '/resources/launch-support-checklist', description: 'Use the launch support checklist to prepare billing, onboarding, settings, release, integration, and error-support pages.', eventName: 'resource_launch_checklist_clicked' },
            { label: 'Team access', href: '/product/team-access', description: 'Plan workspace roles, custom permissions, owner reset, and force sign-out before support work spreads.', eventName: 'resource_team_access_clicked' },
            { label: 'Knowledge Intake', href: '/product/knowledge-intake', description: 'Teach AnswerLattice from selected product links, docs, FAQs, release notes, setup notes, support macros, supported files, screenshots, and short recordings.', eventName: 'resource_knowledge_intake_clicked' },
            { label: 'Knowledge Base', href: '/product/knowledge-base', description: 'Publish reviewed articles that power hosted help, FAQ, widget suggestions, and governance.', eventName: 'resource_knowledge_base_clicked' },
            { label: 'Feedback Review', href: '/resources/feedback-review-workflow', description: 'Plan how ratings, feature requests, and suggestions are sorted by Product Surface before becoming private support signals.', eventName: 'resource_feedback_review_clicked' },
            { label: 'Support Board', href: '/resources/support-board-workflow', description: 'Plan private support cards, internal notes, status history, and answer proposal handoff.', eventName: 'resource_support_board_clicked' },
            { label: 'Install verifier and hosted help', href: '/resources/widget-install-verification', description: 'Understand the script, allowed origins, blocked routes, hosted help domains, runtime verification, context passing, and screenshot boundaries.', eventName: 'resource_install_clicked' },
            { label: 'Developer docs', href: '/developers', description: 'Use the developer hub for install paths, safe context, and verification checks.', eventName: 'resource_developers_clicked' },
            { label: 'Developer quickstarts', href: '/quickstarts', description: 'Use Next.js, React, Vue/Nuxt, or vanilla script examples.', eventName: 'resource_quickstarts_clicked' },
            { label: 'Integrations', href: '/integrations', description: 'Set up Slack or email workflow notifications, test delivery, and health review.', eventName: 'resource_integrations_clicked' },
            { label: 'Hosted help center for SaaS', href: '/resources/hosted-help-setup', description: 'Publish docs, FAQ, and changelog on a support domain.', eventName: 'resource_hosted_help_clicked' },
            { label: 'Security and runtime safety', href: '/resources/support-runtime-safety', description: 'Review tenant isolation, widget origin controls, screenshot input, compiled context boundaries, and owner-approved authority.', eventName: 'resource_security_clicked' },
            { label: 'Security one-pager', href: '/security-one-pager', description: 'Share the concise security and ops summary with developers or buyers, including the manual screenshot boundary.', eventName: 'resource_security_one_pager_clicked' },
        ],
    },
    {
        title: 'Track product movement',
        description: 'Follow updates or move into setup when the product is ready.',
        items: [
            { label: 'Updates', href: '/updates', description: 'Read recent AnswerLattice product and website changes.', eventName: 'resource_updates_clicked' },
            { label: 'Get started', href: '/get-started', description: 'Create a workspace and land in the Activation Command Center.', eventName: 'resource_get_started_clicked' },
            { label: 'Contact', href: '/contact', description: 'Ask for setup help or partnership details.', eventName: 'resource_contact_clicked' },
        ],
    },
];

export const ANSWERLATTICE_RESOURCE_PATH_DETAILS = [
    'Begin with buyer proof and plan checks before moving into setup.',
    'Use fit and comparison pages to confirm the support problem matches AnswerLattice.',
    'Prepare source inputs, install boundaries, and runtime checks before implementation.',
    'Move into workspace setup or contact once the rollout decision is clear.',
] as const;

