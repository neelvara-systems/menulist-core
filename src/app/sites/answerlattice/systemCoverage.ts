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
                title: 'Product pages',
                detail: 'Routes, pages, workflows, tags, and product details map help to the exact area where users are stuck.',
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
        summary: 'The widget, help center, tickets, feedback, and release support share reviewed knowledge instead of becoming separate content silos.',
        items: [
            {
                title: 'Help center and hosted docs',
                detail: 'Articles, scannable topic navigation, categories, FAQ, search, contact flows, and release notes can run in the app or on a branded support domain such as help.yourapp.com.',
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
                detail: 'Owners can track selected support gaps, private notes, status history, assignee context, and draft-answer handoff without mirroring every ticket by default.',
            },
            {
                title: 'Known issues and owner brief',
                detail: 'Owners can publish a contextual, expiring widget notice for a temporary issue and use a read-only Daily Brief to see focused decisions or a clear quiet state.',
            },
            {
                title: 'Changelog awareness',
                detail: 'Release notes can be tied to product areas, tags, and support content that may need review.',
            },
            {
                title: 'Email notifications',
                detail: 'Ticket-created, reply, and status events can notify owners while leaving support review as the core product.',
            },
        ],
    },
    {
        mode: 'Support Review',
        summary: 'AnswerLattice treats official support knowledge as something that must be reviewed, versioned, and kept current.',
        items: [
            {
                title: 'Product areas',
                detail: 'Features, plans, roles, workflows, states, integrations, and errors are mapped to the places where users need help.',
            },
            {
                title: 'Knowledge Map',
                detail: 'Owners can inspect reviewed product relationships, approved-answer coverage, drift, and review state from one compact summary, then carry the selected product-area context into answer review.',
            },
            {
                title: 'Approved answers',
                detail: 'Approved, scoped answers are served first; published owner answers can handle matching repeated questions before fallback.',
            },
            {
                title: 'Stale-answer checks',
                detail: 'Version mismatch, unusual support signals, scope conflicts, and retired product details can flag stale support.',
            },
            {
                title: 'Signal queue',
                detail: 'Tickets, feedback, ratings, feature requests, fallback, and escalations become visible support gaps and draft improvements for review.',
            },
            {
                title: 'Trust and readiness metrics',
                detail: 'Coverage and Product Friction Evidence summarize mapped support pressure across completed windows without presenting weighted load as root cause or product health.',
            },
            {
                title: 'Answer tests and release checks',
                detail: 'Critical questions can be checked against approved-answer behavior, while release impact keeps directly linked answers and tests together before owner confirmation. Neither path overwrites live answers automatically.',
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
                detail: 'Approved public-safe context and private server context can be generated into bounded versioned bundles for enabled readers. The widget currently remains on the controlled server path.',
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
                title: 'Approved knowledge export',
                detail: 'Authorized owners can use Support Truth Export to request a complete bounded JSON package of approved support structure while tickets, conversations, secrets, and audit internals remain excluded.',
            },
            {
                title: 'Separate Firebase mode',
                detail: 'AnswerLattice can run against its own Firebase project, rules, indexes, storage, and Cloud Functions while sharing the web deployment.',
            },
        ],
    },
];
