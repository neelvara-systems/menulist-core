export const CANONICA_SYSTEM_COVERAGE = [
    {
        mode: 'Launch Setup',
        summary: 'Everything a small software team needs to start using Canonica without a custom implementation project.',
        items: [
            {
                title: 'Workspace activation',
                detail: 'Onboarding creates the Canonica workspace, subscription summary, product profile, and first launch checklist.',
            },
            {
                title: 'Knowledge import',
                detail: 'Existing docs, FAQs, starter files, and article-backed FAQ suggestions move through generation, review, publishing, and embedding.',
            },
            {
                title: 'Product surfaces',
                detail: 'Routes, pages, workflows, tags, and entities connect help to the exact product area where users are stuck.',
            },
            {
                title: 'Widget install',
                detail: 'The owner configures appearance, allowed origins, blocked routes, install snippets, custom help domains, and runtime verification.',
            },
            {
                title: 'Billing and credits',
                detail: 'Beta setup starts immediately; paid plans, invoices, transactions, and support credit top-ups live inside Canonica billing.',
            },
        ],
    },
    {
        mode: 'Support Control',
        summary: 'Customer-facing support surfaces stay connected instead of becoming separate content silos.',
        items: [
            {
                title: 'Help center and hosted docs',
                detail: 'Articles, categories, FAQ, search, contact flows, and release notes can run in the app or on a branded support domain such as help.yourapp.com.',
            },
            {
                title: 'Page-aware widget',
                detail: 'Embedded support receives safe page context and returns related articles, releases, or ticket fallback.',
            },
            {
                title: 'Tickets as fallback',
                detail: 'When approved content is missing, users can raise a ticket with safe debugging context and the resolved case can feed the knowledge queue.',
            },
            {
                title: 'Changelog awareness',
                detail: 'Release notes can be tied to surfaces, entities, tags, and support content that may need review.',
            },
            {
                title: 'Email notifications',
                detail: 'Ticket-created, reply, and status events can notify owners while leaving knowledge governance as the core product.',
            },
        ],
    },
    {
        mode: 'Knowledge Governance',
        summary: 'Canonica treats support knowledge as product truth that must be reviewed, versioned, and kept current.',
        items: [
            {
                title: 'Product ontology',
                detail: 'Features, plans, roles, workflows, states, integrations, and errors are first-class concepts.',
            },
            {
                title: 'Canonical answers',
                detail: 'Approved, scoped answers are retrieved before fallback so repeated questions get stable answers.',
            },
            {
                title: 'Drift checks',
                detail: 'Version mismatch, signal anomaly, scope conflict, and deprecated entity checks flag stale support.',
            },
            {
                title: 'Signal queue',
                detail: 'Tickets, negative feedback, fallback, and escalations become reviewable mutation proposals.',
            },
            {
                title: 'Trust and readiness metrics',
                detail: 'Coverage, drift pressure, failing entities, and escalation pressure are summarized for owners without raw log hunting.',
            },
        ],
    },
    {
        mode: 'Runtime Layer',
        summary: 'The backend is built to stay useful without turning every dashboard into a collection scan.',
        items: [
            {
                title: 'Summary-backed dashboards',
                detail: 'Coverage, trust, context content, widget status, and tenant discovery use compact summary documents.',
            },
            {
                title: 'Nightly governance',
                detail: 'A separate Canonica scheduler handles drift, signal mutation, trust metrics, and controlled expansion jobs.',
            },
            {
                title: 'Cache freshness',
                detail: 'Repeated canonical hits can use cache while compact version manifests prevent stale answer serving.',
            },
            {
                title: 'Runtime verification',
                detail: 'Widget config, allowed origins, blocked routes, context checks, and install status stay visible to the owner.',
            },
            {
                title: 'Separate Firebase mode',
                detail: 'Canonica can run against its own Firebase project, rules, indexes, storage, and Cloud Functions while sharing the web deployment.',
            },
        ],
    },
];
