import type { AnswerlatticeResourceArticle } from './types';

export const ANSWERLATTICE_RESOURCE_ARTICLES: AnswerlatticeResourceArticle[] = [
    {
        slug: 'answerlattice-operating-guide',
        path: '/resources/answerlattice-operating-guide',
        title: 'AnswerLattice Operating Guide',
        description: 'Start with the smallest trustworthy support setup, then add team coordination and deeper review controls only when ownership or risk grows.',
        metaTitle: 'AnswerLattice Operating Guide | Start Small and Grow',
        metaDescription: 'A progressive AnswerLattice manual for solo founders, small teams, and product groups that need reviewed support without unnecessary operations.',
        quickAnswer: 'Start with ten priority questions, a verified widget, safe fallback, and Daily Brief. Add team coordination when ownership spreads, then add deeper review controls when releases or answer risk justify them.',
        readingTime: '10 min read',
        publishedAt: '2026-07-31',
        updatedAt: '2026-07-31',
        priority: 0.82,
        changeFrequency: 'monthly',
        cluster: 'launch-setup',
        primaryCta: { label: 'Open founder launch kit', href: '/resources/founder-launch-kit' },
        relatedSlugs: ['launch-support-checklist', 'approved-answers-before-fallback', 'support-board-workflow'],
        sections: [
            {
                id: 'one-product-three-depths',
                title: 'One product, three operating depths',
                body: [
                    'Solo founders remain the primary starting point. Small teams and product groups inside larger companies use the same reviewed support system, adding existing controls only when support ownership or answer risk grows.',
                    'Start, Coordinate, and Govern are guidance levels. They are not workspace modes, automatic scores, separate products, or required setup stages.',
                ],
                bullets: [
                    'Start: one accountable owner launches trustworthy self-service.',
                    'Coordinate: selected teammates divide support and review work.',
                    'Govern: product, support, and engineering protect high-risk answers across releases.',
                    'Company size alone does not decide fit. The operating group and support problem do.',
                ],
            },
            {
                id: 'start',
                title: 'Start with the smallest useful support layer',
                body: [
                    'A founder should not configure every AnswerLattice capability before users receive help. The first job is to cover the most important questions and prove both the known-answer and safe-fallback paths.',
                ],
                checklist: [
                    'Create one workspace for one product.',
                    'Add the product profile, support email, and two to five support-heavy pages.',
                    'Import the product material you already trust.',
                    'Review ten priority customer questions and approve only answers supported by your product knowledge.',
                    'Run canonical-only Answer Tests for critical expected answers.',
                    'Verify one known-answer path and one missing-answer fallback path in the widget.',
                    'Use Daily Brief after launch and leave stable areas alone.',
                ],
            },
            {
                id: 'ignore-at-first',
                title: 'What a founder can ignore at first',
                body: [
                    'Available features are not mandatory work. Full utilization means using the correct operating depth, not enabling every screen.',
                ],
                bullets: [
                    'Do not create custom roles while one owner operates the workspace.',
                    'Do not use Support Board for every ticket.',
                    'Do not configure workflow notifications while one review habit is enough.',
                    'Do not open advanced Knowledge Map or review views unless a decision points there.',
                    'Do not request API distribution before approved answer coverage and key controls are ready.',
                    'Do not build a large article library merely to make setup look complete.',
                ],
            },
            {
                id: 'coordinate',
                title: 'Coordinate when support ownership spreads',
                body: [
                    'Move beyond the founder setup when a second person regularly responds to users, reviews answers, ships releases that change official support, or owns recurring follow-up.',
                ],
                checklist: [
                    'Invite only active support, product, or engineering operators.',
                    'Start with protected Owner, Manager, and Support Staff roles.',
                    'Create a custom role only when a real permission boundary requires it.',
                    'Add Slack or email notifications when work is being missed outside the workspace.',
                    'Use Support Board only for selected issues that need private notes, ownership, or follow-up.',
                    'Record releases that change plans, roles, limits, navigation, integrations, or errors.',
                    'Expand Answer Tests around billing, permissions, cancellation, retention, and security.',
                ],
            },
            {
                id: 'govern',
                title: 'Add deeper review controls when answer risk grows',
                body: [
                    'A growing company does not need every employee in AnswerLattice. A bounded product, support, and engineering group can use deeper controls when several functions rely on the same reviewed support knowledge or releases frequently affect existing answers.',
                ],
                checklist: [
                    'Keep one accountable owner for official support answers.',
                    'Use Knowledge Map to locate the product area and connected review work.',
                    'Preview release impact before activating customer-visible changes.',
                    'Protect critical answers with repeatable tests.',
                    'Use role controls, version history, exports, and audit evidence for accountable review.',
                    'Keep an existing helpdesk as the conversation and SLA system when those operations are required.',
                    'Enable public API or external distribution only when available, verified, and supported by sufficient approved coverage.',
                ],
            },
            {
                id: 'feature-triggers',
                title: 'Introduce features because a real trigger exists',
                bullets: [
                    'Team Access: a second person regularly operates support or review work.',
                    'Workflow Notifications: work is missed without an external alert.',
                    'Support Board: a selected issue needs internal ownership or notes.',
                    'Knowledge Map: a decision needs cross-feature product context.',
                    'Release Impact: a release changes customer-visible product guidance.',
                    'Answer Tests: an answer is important enough to protect from regression.',
                    'Support Truth Export: a buyer or downstream team needs bounded evidence.',
                    'Public API: approved coverage and key controls are ready.',
                ],
            },
            {
                id: 'normal-rhythm',
                title: 'Keep the normal operating rhythm small',
                checklist: [
                    'Handle real user fallback before internal improvement work.',
                    'Review only qualified stale-answer, release-impact, or repeated-gap items.',
                    'Approve, edit, classify, defer, or reject the exact item.',
                    'Use one optional weekly review when the quiet Daily Brief needs no decision.',
                    'Do not duplicate the same issue across several queues without one accountable owner.',
                ],
            },
            {
                id: 'larger-company-boundary',
                title: 'Know the larger-company boundary',
                body: [
                    'AnswerLattice can support a product group inside a larger company through team access, permissions, tests, release review, exports, and audit history. It remains reviewed support infrastructure rather than a contact-center suite.',
                ],
                bullets: [
                    'Good fit: one product group needs reviewed support knowledge across widget, hosted help, people, and releases.',
                    'Keep the existing helpdesk when the company needs omnichannel routing, workforce management, or SLA operations.',
                    'Do not assume unverified SAML, SCIM, contractual service levels, public certifications, or procurement commitments.',
                    'Evaluate required controls and integrations directly instead of treating employee count as proof of fit.',
                ],
            },
        ],
        faq: [
            {
                question: 'Do I need to use every AnswerLattice feature?',
                answer: 'No. Correct adoption means using the smallest depth that keeps support reliable. A founder may remain on the Start operating depth for months.',
            },
            {
                question: 'Should a larger company invite every employee?',
                answer: 'No. Invite the bounded group that maintains official support, responds to fallback, keeps product context current, or approves changes.',
            },
            {
                question: 'Does AnswerLattice replace an existing helpdesk?',
                answer: 'No. A company can keep its helpdesk for conversations, routing, and SLAs while AnswerLattice keeps the approved product knowledge used by the widget, help center, and future AI agents reviewed and current.',
            },
            {
                question: 'Will AnswerLattice move a workspace between depths automatically?',
                answer: 'No. Start, Coordinate, and Govern are manual operating guidance. They do not create a maturity score or change workspace data.',
            },
        ],
    },
    {
        slug: 'launch-support-checklist',
        path: '/resources/launch-support-checklist',
        title: 'Launch Support Checklist',
        description: 'Prepare the first places users will get help before launch: stuck pages, starter answers, docs, tickets, and widget verification.',
        metaTitle: 'Launch Support Checklist | AnswerLattice Resources',
        metaDescription: 'A practical AnswerLattice checklist for preparing in-app support before a SaaS launch.',
        quickAnswer: 'Start with the pages where users get stuck, prepare starter support knowledge, review the first answers, then install and verify the widget before launch.',
        readingTime: '6 min read',
        publishedAt: '2026-06-02',
        updatedAt: '2026-06-02',
        priority: 0.72,
        changeFrequency: 'monthly',
        cluster: 'launch-setup',
        primaryCta: { label: 'Open Pre-Onboarding Kit', href: '/pre-onboarding' },
        relatedSlugs: ['pre-onboarding-source-package', 'widget-install-verification', 'approved-answers-before-fallback'],
        sections: [
            {
                id: 'start-pages',
                title: 'Start with stuck pages',
                body: [
                    'A launch support setup does not need every possible answer on day one. It needs the pages where a new user is most likely to pause, misread a plan, miss a setting, or hit an error.',
                    'AnswerLattice works best when the first support map is tied to concrete product pages instead of a broad help center wish list.',
                ],
                checklist: [
                    'List billing, onboarding, settings, invite, integration, release, and error pages.',
                    'Mark the 2-5 pages that create the highest launch risk.',
                    'Write the expected or recurring questions for each page in plain language.',
                ],
            },
            {
                id: 'starter-truth',
                title: 'Prepare starter support knowledge',
                body: [
                    'Use docs, FAQs, release notes, setup notes, policies, product screenshots, and owner notes as starter truth. Keep unsupported guesses out of the source package.',
                ],
                bullets: [
                    'Use reviewed links where possible.',
                    'Include owner notes for known confusing flows.',
                    'Mark missing or blocked sources as not available instead of inventing coverage.',
                ],
            },
            {
                id: 'launch-check',
                title: 'Verify before launch',
                checklist: [
                    'Approved answers are reviewed before fallback.',
                    'The widget runs only on allowed origins.',
                    'Blocked routes stay blocked.',
                    'Users can create fallback tickets when answer coverage is missing.',
                    'First support gaps have a review owner.',
                ],
            },
        ],
        faq: [
            {
                question: 'Do we need existing support volume before using this checklist?',
                answer: 'No. The checklist is useful for live, beta, and near-launch products with starter support knowledge and expected support questions.',
            },
        ],
    },
    {
        slug: 'pre-onboarding-source-package',
        path: '/resources/pre-onboarding-source-package',
        title: 'Pre-Onboarding Source Package',
        description: 'Prepare repo, website, docs, owner notes, source exclusions, and screenshot boundaries before AnswerLattice Knowledge Intake.',
        metaTitle: 'Pre-Onboarding Source Package | AnswerLattice Resources',
        metaDescription: 'How to prepare an AnswerLattice-ready source package with available product sources, owner review, and clear exclusions.',
        quickAnswer: 'The source package should show what is available, what is blocked, what product is in scope, and what the owner has reviewed.',
        readingTime: '7 min read',
        publishedAt: '2026-06-02',
        updatedAt: '2026-06-02',
        priority: 0.72,
        changeFrequency: 'monthly',
        cluster: 'launch-setup',
        primaryCta: { label: 'Run pre-onboarding', href: '/pre-onboarding' },
        relatedSlugs: ['launch-support-checklist', 'safe-page-context', 'support-runtime-safety'],
        sections: [
            {
                id: 'scope',
                title: 'Define the product scope',
                body: [
                    'Many repositories contain more than one product, internal tool, or shared infrastructure area. The source package should name the target product first and explicitly exclude sister products unless they affect support.',
                ],
                checklist: [
                    'Name the product AnswerLattice should learn.',
                    'List app, website, docs, and owner-note sources separately.',
                    'Document sister-product exclusions.',
                ],
            },
            {
                id: 'available-sources',
                title: 'Use available sources only',
                body: [
                    'The package can include public links, docs, repo files, owner notes, screenshots, and short recordings when they are accessible. Blocked sources stay pending.',
                ],
                bullets: [
                    'Use not available for sources the agent cannot access.',
                    'Use not applicable when the product does not have that source type.',
                    'Do not ask an AI coding agent to pretend it has seen login-only pages.',
                ],
            },
            {
                id: 'owner-review',
                title: 'Keep owner review visible',
                checklist: [
                    'Mark claims that need owner approval.',
                    'Mark screenshots or recordings that need privacy review.',
                    'Keep generated support outputs review-ready until approved.',
                ],
            },
        ],
    },
    {
        slug: 'safe-page-context',
        path: '/resources/safe-page-context',
        title: 'Safe Page Context',
        description: 'Use page hints that help support answers without sending tenant IDs, user IDs, account records, tokens, or billing data.',
        metaTitle: 'Safe Page Context | AnswerLattice Resources',
        metaDescription: 'AnswerLattice safe page-context guidance for widget installs, route updates, blocked data, and screenshot boundaries.',
        quickAnswer: 'Safe context describes the page. It does not identify the tenant, user, account, payment record, or private customer payload.',
        readingTime: '5 min read',
        publishedAt: '2026-06-02',
        updatedAt: '2026-06-02',
        priority: 0.7,
        changeFrequency: 'monthly',
        cluster: 'widget-install',
        primaryCta: { label: 'Read developer doc', href: '/developers/safe-page-context' },
        relatedSlugs: ['widget-install-verification', 'support-runtime-safety', 'pre-onboarding-source-package'],
        sections: [
            {
                id: 'allowed',
                title: 'Allowed context',
                body: [
                    'The widget can use stable product-page hints such as path, title, feature, workflow, role, and locale. These values help answer selection without turning browser context into account identity.',
                ],
                bullets: [
                    'path: current app path without secret query values',
                    'title: readable page name',
                    'feature or workflow: billing, onboarding, settings, release, or support area',
                    'role and locale: broad support hints only',
                ],
            },
            {
                id: 'blocked',
                title: 'Blocked context',
                checklist: [
                    'Do not send tenant IDs, store IDs, user IDs, emails, phone numbers, or names.',
                    'Do not send tokens, cookies, JWTs, service keys, secrets, or payment data.',
                    'Do not send raw customer records or private account metadata.',
                ],
            },
            {
                id: 'screenshots',
                title: 'Screenshot boundary',
                body: [
                    'Screenshots are explicit user input. AnswerLattice public copy should keep that boundary clear: upload or paste is allowed when the user chooses it; automatic capture is not part of the public claim.',
                ],
            },
        ],
    },
    {
        slug: 'widget-install-verification',
        path: '/resources/widget-install-verification',
        title: 'Widget Install Verification',
        description: 'Check script loading, widget key placement, allowed origins, blocked routes, safe context, and dashboard status before launch.',
        metaTitle: 'Widget Install Verification | AnswerLattice Resources',
        metaDescription: 'A verification checklist for AnswerLattice widget installs: script, key, route context, allowed origins, blocked routes, and fallback behavior.',
        quickAnswer: 'The install is ready when the script loads once, safe context updates by route, allowed origins work, blocked routes stay blocked, and dashboard status reflects the test.',
        readingTime: '6 min read',
        publishedAt: '2026-06-02',
        updatedAt: '2026-06-02',
        priority: 0.72,
        changeFrequency: 'monthly',
        cluster: 'widget-install',
        primaryCta: { label: 'Open install guide', href: '/install' },
        relatedSlugs: ['safe-page-context', 'launch-support-checklist', 'support-runtime-safety'],
        sections: [
            {
                id: 'script',
                title: 'Script checks',
                checklist: [
                    'Load the v1 widget script once.',
                    'Keep the widget key in a client-safe environment variable where possible.',
                    'Do not add duplicate script tags on individual pages.',
                ],
            },
            {
                id: 'runtime',
                title: 'Runtime checks',
                checklist: [
                    'Open the product from an allowed origin.',
                    'Navigate between pages and confirm context changes.',
                    'Open a blocked route and confirm the widget does not mount.',
                    'Send a test question that should use an approved answer.',
                    'Send a question with missing coverage and confirm fallback behavior.',
                ],
            },
            {
                id: 'dashboard',
                title: 'Dashboard checks',
                body: [
                    'The dashboard remains the owner of allowed origins, blocked routes, widget key status, and runtime verification. Public pages should route developers back to that source instead of inventing duplicate setup controls.',
                ],
            },
        ],
    },
    {
        slug: 'approved-answers-before-fallback',
        path: '/resources/approved-answers-before-fallback',
        title: 'Approved Answers Before Fallback',
        description: 'Understand the AnswerLattice support path: reviewed answers and owner answers first, fallback only when coverage is missing.',
        metaTitle: 'Approved Answers Before Fallback | AnswerLattice Resources',
        metaDescription: 'How AnswerLattice keeps approved support answers before fallback while making missing coverage reviewable.',
        quickAnswer: 'AnswerLattice should prefer reviewed support knowledge before fallback, then turn missing or repeated gaps into review work.',
        readingTime: '6 min read',
        publishedAt: '2026-06-02',
        updatedAt: '2026-06-02',
        priority: 0.72,
        changeFrequency: 'monthly',
        cluster: 'knowledge-governance',
        primaryCta: { label: 'Review approved answers', href: '/product/knowledge-governance' },
        relatedSlugs: ['support-board-workflow', 'feedback-review-workflow', 'launch-support-checklist'],
        sections: [
            {
                id: 'answer-path',
                title: 'The answer path',
                body: [
                    'The useful public claim is not that every answer is perfect. The useful claim is that approved support knowledge is preferred before fallback, and missing coverage becomes visible.',
                ],
                bullets: [
                    'Reviewed support answers come first.',
                    'Published owner answers can handle short repeated questions.',
                    'Related docs or hosted help can support the answer.',
                    'Fallback remains available when coverage is missing.',
                ],
            },
            {
                id: 'review',
                title: 'Missing answers become review work',
                body: [
                    'Support gaps should not disappear as chat noise. They should be visible enough for the owner or support team to decide whether a new answer, article, FAQ, product fix, or ticket follow-up is needed.',
                ],
            },
            {
                id: 'boundaries',
                title: 'Public claim boundary',
                checklist: [
                    'Do not claim perfect answer behavior.',
                    'Do not claim every ticket becomes an answer.',
                    'Do not claim automatic publishing.',
                    'Do claim human-reviewed answer changes.',
                ],
            },
        ],
    },
    {
        slug: 'support-board-workflow',
        path: '/resources/support-board-workflow',
        title: 'Support Board Workflow',
        description: 'Use private support cards, internal notes, status history, selected follow-up, and draft-answer handoff safely.',
        metaTitle: 'Support Board Workflow | AnswerLattice Resources',
        metaDescription: 'A practical AnswerLattice Support Board workflow for private support cards, internal notes, status history, and draft-answer handoff.',
        quickAnswer: 'The Support Board is a private owner/staff work surface for selected support follow-up, not a public roadmap or automatic answer publisher.',
        readingTime: '5 min read',
        publishedAt: '2026-06-02',
        updatedAt: '2026-06-02',
        priority: 0.68,
        changeFrequency: 'monthly',
        cluster: 'support-control',
        primaryCta: { label: 'Open Support Board feature', href: '/product/support-board' },
        relatedSlugs: ['feedback-review-workflow', 'approved-answers-before-fallback', 'support-runtime-safety'],
        sections: [
            {
                id: 'private-board',
                title: 'Keep board work private',
                body: [
                    'Support Board cards are for owner and staff review. They can hold context, notes, status, and selected follow-up, but they are not public voting items or public roadmap entries.',
                ],
            },
            {
                id: 'handoff',
                title: 'Use draft-answer handoff carefully',
                checklist: [
                    'Create a draft answer only when a support gap needs reusable support knowledge.',
                    'Keep internal notes out of published answers.',
                    'Require owner or permitted staff review before answer changes become active.',
                ],
            },
            {
                id: 'status',
                title: 'Track status without overclaiming automation',
                body: [
                    'The public claim should stay manual-first: private cards, status history, selected follow-up, and reviewed handoff. Do not imply every signal automatically becomes a card or answer.',
                ],
            },
        ],
    },
    {
        slug: 'feedback-review-workflow',
        path: '/resources/feedback-review-workflow',
        title: 'Feedback Review Workflow',
        description: 'Review ratings, product feedback, feature requests, and suggestions as private support signals before board or answer handoff.',
        metaTitle: 'Feedback Review Workflow | AnswerLattice Resources',
        metaDescription: 'How AnswerLattice Feedback Review turns ratings, feature requests, and suggestions into private support signals without public roadmap claims.',
        quickAnswer: 'Feedback Review helps sort useful product feedback into private support signals; it does not create a public voting board or publish support answers automatically.',
        readingTime: '5 min read',
        publishedAt: '2026-06-02',
        updatedAt: '2026-06-02',
        priority: 0.68,
        changeFrequency: 'monthly',
        cluster: 'support-control',
        primaryCta: { label: 'Open Feedback Review feature', href: '/product/feedback-review' },
        relatedSlugs: ['support-board-workflow', 'approved-answers-before-fallback', 'launch-support-checklist'],
        sections: [
            {
                id: 'signals',
                title: 'Sort feedback by support value',
                body: [
                    'Ratings, feature requests, suggestions, and product-area feedback can show where users are confused or underserved. The first job is to sort useful signals from noise.',
                ],
                bullets: [
                    'Group feedback by product area.',
                    'Separate bugs, suggestions, feature requests, and answer gaps.',
                    'Keep private review separate from public roadmap promises.',
                ],
            },
            {
                id: 'handoff',
                title: 'Choose the next handoff',
                checklist: [
                    'Send follow-up work to Support Board when staff action is needed.',
                    'Create draft answers when a repeated support answer is missing.',
                    'Leave product-roadmap decisions outside public help content.',
                ],
            },
        ],
    },
    {
        slug: 'support-credits-and-pricing',
        path: '/resources/support-credits-and-pricing',
        title: 'Support Credits and Pricing',
        description: 'Understand which provider-backed support operations use credits and which approved, deterministic, review, and browsing paths do not.',
        metaTitle: 'Support Credits and Pricing | AnswerLattice Resources',
        metaDescription: 'Plain-language AnswerLattice support-credit and pricing guidance for founders evaluating setup, plans, and top-ups.',
        quickAnswer: 'Support credits are used for provider-backed fallback answers, full-runtime answer tests, starter-answer generation, screenshot OCR, and short recording transcription. Approved widget answers, deterministic checks, draft review, selected text import, publishing infrastructure, and help browsing are not per-view charges.',
        readingTime: '5 min read',
        publishedAt: '2026-06-02',
        updatedAt: '2026-07-19',
        priority: 0.66,
        changeFrequency: 'monthly',
        cluster: 'pricing',
        primaryCta: { label: 'Open pricing', href: '/pricing' },
        relatedSlugs: ['launch-support-checklist', 'support-runtime-safety', 'approved-answers-before-fallback'],
        sections: [
            {
                id: 'definition',
                title: 'What support credits mean',
                body: [
                    'Pricing copy should match the runtime ledger: provider-backed fallback answers and full-runtime answer tests use one credit, the source-backed first-ten starter-answer run uses one credit, screenshot OCR uses one credit, and short recording transcription uses two credits.',
                ],
            },
            {
                id: 'not-per-view',
                title: 'What not to imply',
                checklist: [
                    'Do not imply every hosted help page view consumes a support credit.',
                    'Do not imply every widget load consumes a support credit.',
                    'Do not publish a pricing schema that conflicts with visible pricing.',
                ],
            },
            {
                id: 'buyer-fit',
                title: 'Plan fit language',
                body: [
                    'Plan guidance should describe product stage, support volume, source preparation, and review needs in plain language. Keep detailed billing operations inside the dashboard and pricing page.',
                ],
            },
        ],
    },
    {
        slug: 'hosted-help-setup',
        path: '/resources/hosted-help-setup',
        title: 'Hosted Help Setup',
        description: 'Plan docs, FAQs, changelog content, owner answers, support domains, and widget handoff for hosted help.',
        metaTitle: 'Hosted Help Setup | AnswerLattice Resources',
        metaDescription: 'How to plan AnswerLattice hosted help for docs, FAQs, changelog content, custom owner answers, support domains, and widget handoff.',
        quickAnswer: 'Hosted help should publish reviewed support knowledge and connect back to widget answers, fallback, and support review.',
        readingTime: '6 min read',
        publishedAt: '2026-06-02',
        updatedAt: '2026-06-02',
        priority: 0.68,
        changeFrequency: 'monthly',
        cluster: 'support-control',
        primaryCta: { label: 'Open hosted help page', href: '/hosted-help-center-for-saas' },
        relatedSlugs: ['approved-answers-before-fallback', 'safe-page-context', 'widget-install-verification'],
        sections: [
            {
                id: 'surfaces',
                title: 'Choose what users can open',
                checklist: [
                    'Reviewed articles for longer support topics.',
                    'Owner answers for short repeated questions.',
                    'Changelog content for release-related support.',
                    'Fallback tickets for missing coverage.',
                ],
            },
            {
                id: 'domain',
                title: 'Use support-domain language carefully',
                body: [
                    'A custom help domain can be buyer-visible value, but it must stay connected to implemented hosted help behavior and domain validation. Do not imply a separate public CMS product.',
                ],
            },
            {
                id: 'handoff',
                title: 'Connect hosted help to the widget',
                body: [
                    'Hosted help is most useful when the same reviewed support knowledge can support in-app widget answers and support review.',
                ],
            },
        ],
    },
    {
        slug: 'support-runtime-safety',
        path: '/resources/support-runtime-safety',
        title: 'Support Runtime Safety',
        description: 'Keep public support runtime bounded through source separation, safe context, allowed origins, blocked routes, review, and cache-aware delivery.',
        metaTitle: 'Support Runtime Safety | AnswerLattice Resources',
        metaDescription: 'AnswerLattice runtime-safety guidance for source separation, safe widget context, allowed origins, blocked routes, review, and cache-aware support delivery.',
        quickAnswer: 'Runtime safety comes from source separation, safe browser context, dashboard route controls, owner review, and bounded delivery.',
        readingTime: '6 min read',
        publishedAt: '2026-06-02',
        updatedAt: '2026-06-02',
        priority: 0.7,
        changeFrequency: 'monthly',
        cluster: 'security',
        primaryCta: { label: 'Open security page', href: '/security' },
        relatedSlugs: ['safe-page-context', 'widget-install-verification', 'support-credits-and-pricing'],
        sections: [
            {
                id: 'source-separation',
                title: 'Separate source truth from runtime context',
                body: [
                    'AnswerLattice public pages should describe the support knowledge layer without exposing drafts, raw tickets, audit logs, private account records, or workspace internals.',
                ],
            },
            {
                id: 'controls',
                title: 'Use runtime controls',
                checklist: [
                    'Allowed origins restrict where widget config can run.',
                    'Blocked routes keep sensitive surfaces out of widget mounting.',
                    'Safe page context avoids private identifiers.',
                    'Owner review controls answer changes.',
                ],
            },
            {
                id: 'cost-boundary',
                title: 'Keep cost claims bounded',
                body: [
                    'Public runtime copy can mention bounded delivery and cache-aware support paths, but it should not imply unlimited backend reads, unrestricted provider calls, or hidden customer data access.',
                ],
            },
        ],
    },
];

export function getAnswerlatticeResourceArticle(pathOrSlug: string) {
    return ANSWERLATTICE_RESOURCE_ARTICLES.find((article) => (
        article.path === pathOrSlug || article.slug === pathOrSlug
    ));
}

export function getAnswerlatticeRelatedResourceArticles(article: AnswerlatticeResourceArticle) {
    return article.relatedSlugs
        .map((slug) => getAnswerlatticeResourceArticle(slug))
        .filter((relatedArticle): relatedArticle is AnswerlatticeResourceArticle => relatedArticle !== undefined);
}
