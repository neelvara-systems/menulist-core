export const CANONICA_ENGINE_PILLARS = [
    {
        number: '01',
        title: 'Product Ontology',
        description: 'Model your product as structured entities: features, plans, roles, workflows, states, integrations, and errors. Articles reference concepts; concepts do not disappear inside documents or loose tags.',
        highlight: 'Foundation layer',
    },
    {
        number: '02',
        title: 'Canonical Answer Engine',
        description: 'Governed, versioned, entity-bound answers are retrieved before fallback. When an approved answer matches the same scope and version, users get the same support truth every time.',
        highlight: 'Core engine',
    },
    {
        number: '03',
        title: 'Drift Governance',
        description: 'Version mismatch, signal anomaly, scope conflict, and deprecated entity checks flag stale answers through nightly audits and release review. Advisory, never blocking.',
        highlight: 'Control plane',
    },
    {
        number: '04',
        title: 'Signal Mutation',
        description: 'Tickets, negative feedback, fallback searches, and escalations become structured signals. Signals cluster by entity and propose knowledge changes for human approval.',
        highlight: 'Self-improvement',
    },
];
