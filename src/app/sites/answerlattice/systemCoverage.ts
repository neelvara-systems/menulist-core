export const ANSWERLATTICE_SYSTEM_COVERAGE = [
    {
        mode: 'Launch Setup',
        summary: 'Everything a small software team needs to start using AnswerLattice without a custom implementation project.',
        items: [
            {
                title: 'Workspace activation',
                detail: 'Onboarding creates the AnswerLattice workspace, subscription summary, product profile, team access layer, and first launch proof.',
            },
            {
                title: 'Team access',
                detail: 'Owners can add workspace members, assign AnswerLattice-specific roles, reset temporary passcodes, and force sign-out while keeping access scoped to the AnswerLattice workspace.',
            },
            {
                title: 'Knowledge import',
                detail: 'Existing docs, FAQs, owner answers, starter files, and article-backed FAQ suggestions move through generation, review, publishing, and embedding.',
            },
            {
                title: 'Product surfaces',
                detail: 'Routes, pages, workflows, tags, and entities map help to the exact product area where users are stuck.',
            },
            {
                title: 'Widget install',
                detail: 'The owner configures appearance, allowed origins, blocked routes, install snippets, custom help domains, and runtime verification.',
            },
            {
                title: 'Billing and credits',
                detail: 'Paid setup starts with Starter; plans, invoices, transactions, and support credit top-ups live inside AnswerLattice billing.',
            },
        ],
    },
    {
        mode: 'Support Control',
        summary: 'Customer-facing support surfaces share reviewed truth instead of becoming separate content silos.',
        items: [
            {
                title: 'Help center and hosted docs',
                detail: 'Articles, categories, FAQ, search, contact flows, and release notes can run in the app or on a branded support domain such as help.yourapp.com.',
            },
            {
                title: 'In-app widget',
                detail: 'Embedded support receives safe page context and returns approved answers, owner answers, related articles, releases, or ticket fallback.',
            },
            {
                title: 'Tickets as fallback',
                detail: 'When approved content is missing, users can raise a ticket with safe debugging context and the resolved case can feed the knowledge queue.',
            },
            {
                title: 'Support Board',
                detail: 'Owners can track selected support gaps, private notes, status history, assignee context, and answer-proposal handoff without mirroring every ticket by default.',
            },
            {
                title: 'Known issues and owner brief',
                detail: 'Owners can publish a contextual, expiring widget notice for a temporary issue and use a read-only summary assistant to find the governed review screen that needs attention.',
            },
            {
                title: 'Changelog awareness',
                detail: 'Release notes can be tied to surfaces, entities, tags, and support content that may need review.',
            },
            {
                title: 'Email notifications',
                detail: 'Ticket-created, reply, and status events can notify owners while leaving support review as the core product.',
            },
        ],
    },
    {
        mode: 'Support Review',
        summary: 'AnswerLattice treats support knowledge as product truth that must be reviewed, versioned, and kept current.',
        items: [
            {
                title: 'Product surfaces',
                detail: 'Features, plans, roles, workflows, states, integrations, and errors are mapped as support-relevant surfaces.',
            },
            {
                title: 'Approved answers',
                detail: 'Approved, scoped answers are served first; published owner answers can handle matching repeated questions before fallback.',
            },
            {
                title: 'Stale-answer checks',
                detail: 'Version mismatch, signal anomaly, scope conflict, and deprecated entity checks flag stale support.',
            },
            {
                title: 'Signal queue',
                detail: 'Tickets, feedback, ratings, feature requests, fallback, and escalations become reviewable support signals and mutation proposals.',
            },
            {
                title: 'Trust and readiness metrics',
                detail: 'Coverage, stale-answer pressure, failing entities, and escalation pressure are summarized for owners without raw log hunting.',
            },
            {
                title: 'Answer tests and release checks',
                detail: 'Critical questions can be saved and checked against approved-answer behavior, with release-scoped runs and rollback proposals that never overwrite live answers automatically.',
            },
        ],
    },
    {
        mode: 'Runtime Layer',
        summary: 'The backend is built to serve approved support context quickly without turning runtime traffic into collection scans.',
        items: [
            {
                title: 'Summary-backed dashboards',
                detail: 'Coverage, trust, context content, widget status, and tenant discovery use compact summary documents.',
            },
            {
                title: 'Compiled context bundles',
                detail: 'Approved public-safe context and private server context can be generated into bounded versioned bundles for enabled readers. The widget currently remains on the governed server path.',
            },
            {
                title: 'Workspace-local review',
                detail: 'A centralized AnswerLattice scheduler checks due workspaces by their local support-day end time, then repairs stale compiled context and review summaries.',
            },
            {
                title: 'Cache freshness',
                detail: 'Repeated approved-answer hits can use cache while compact version manifests prevent stale answer serving.',
            },
            {
                title: 'Runtime verification',
                detail: 'Widget config, allowed origins, blocked routes, context checks, compiled bundle status, and install status stay visible to the owner.',
            },
            {
                title: 'Verified context and bounded evidence',
                detail: 'Optional short-lived signed visitor claims and exact-host HTTPS evidence links improve support context without accepting workspace scope from the browser or recording user sessions.',
            },
            {
                title: 'Support-truth portability',
                detail: 'Authorized owners can request a complete bounded JSON export of approved support structure while tickets, conversations, secrets, and audit internals remain excluded.',
            },
            {
                title: 'Separate Firebase mode',
                detail: 'AnswerLattice can run against its own Firebase project, rules, indexes, storage, and Cloud Functions while sharing the web deployment.',
            },
        ],
    },
];
