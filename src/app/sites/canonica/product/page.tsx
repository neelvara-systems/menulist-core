import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';

export const metadata: Metadata = {
    title: 'Product',
    description: 'Canonica\'s five architectural pillars: Product Ontology, Canonical Answer Engine, Drift Governance, Signal Mutation, and API Integration.',
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const FEATURES = [
    {
        id: 'ontology',
        badge: 'Pillar 1',
        title: 'Product Ontology',
        description: 'Model your entire product as structured entities — features, plans, roles, workflows, states, integrations, and errors. Each entity has a canonical name, type, relationships, and a deterministic search index.',
        capabilities: [
            'AI-assisted entity extraction from existing KB articles',
            'Human-validated candidate approval pipeline',
            'Typed relationships between entities',
            'Deterministic search index with synonyms and stemming',
            'Tenant-scoped, version-aware entity graph',
        ],
    },
    {
        id: 'canonical-answers',
        badge: 'Pillar 2',
        title: 'Canonical Answer Engine',
        description: 'Replace probabilistic AI outputs with governed, versioned, entity-bound answers. Each answer is a persistent knowledge asset — not an ephemeral generation. Same query, same context, same answer. Every time.',
        capabilities: [
            'Entity-bound answers with version windows',
            'Scope filtering by plan, role, and product state',
            'Specificity scoring (version match → scope depth → recency → confidence)',
            'Zero LLM calls during retrieval — fully deterministic',
            'RAG fallback for uncovered queries, logged as CANONICAL_MISS',
        ],
    },
    {
        id: 'drift-detection',
        badge: 'Pillar 3',
        title: 'Drift Governance',
        description: 'Detect when answers become stale through four deterministic drift classes. Every product release triggers evaluation. Nightly batch audits catch what releases miss.',
        capabilities: [
            'Version drift — entity changed, answer not revalidated',
            'Signal anomaly — negative feedback spike detected',
            'Scope conflict — overlapping active answers found',
            'Orphan entity — deprecated entity still bound to answers',
            'Advisory governance — flags, never blocks',
        ],
    },
    {
        id: 'signal-mutation',
        badge: 'Pillar 4',
        title: 'Signal Mutation Engine',
        description: 'Every support ticket and negative chat feedback becomes a structured signal. Signals cluster by entity. Clusters that exceed threshold auto-generate mutation proposals. You review and approve. Knowledge evolves.',
        capabilities: [
            'Fire-and-forget signal emission (never blocks operations)',
            'Entity-based clustering with threshold detection',
            'Four mutation types: content refinement, scope adjustment, version update, new answer required',
            'Human-in-the-loop approval (no autonomous editing)',
            '14-day post-mutation impact tracking',
        ],
    },
    {
        id: 'api',
        badge: 'Pillar 5',
        title: 'API & Integration',
        description: 'Embed Canonica behind your existing support tools. Public API for canonical answer retrieval. Version-aware endpoints. Drift webhooks. Signal ingestion. Works with Zendesk, Intercom, or custom systems.',
        capabilities: [
            'REST API for canonical answer retrieval',
            'Version-aware, scope-filtered endpoints',
            'Outbound drift event webhooks',
            'Inbound signal ingestion endpoint',
            'Tenant-isolated, rate-limited access',
        ],
    },
];

export default function CanonicaProductPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                {/* Hero */}
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Product</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Knowledge infrastructure,{' '}
                        <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">not another tool</span>
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg text-[#a0a0c0]">
                        Five architectural pillars that transform how SaaS companies govern support knowledge.
                        Deterministic. Versioned. Self-improving.
                    </p>
                </section>

                {/* Feature sections */}
                {FEATURES.map((feature, i) => (
                    <section
                        key={feature.id}
                        id={feature.id}
                        className={`border-t border-white/[0.06] px-6 py-20 ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}
                    >
                        <div className="mx-auto max-w-4xl">
                            <span className="mb-4 inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
                                {feature.badge}
                            </span>
                            <h2 className="mb-4 text-3xl font-bold">{feature.title}</h2>
                            <p className="mb-8 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                                {feature.description}
                            </p>
                            <ul className="space-y-3">
                                {feature.capabilities.map((cap, j) => (
                                    <li key={j} className="flex items-start gap-3 text-sm text-[#808099]">
                                        <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[10px] text-indigo-400">
                                            ✓
                                        </span>
                                        {cap}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>
                ))}

                {/* Bottom CTA */}
                <section className="border-t border-white/[0.06] px-6 py-20 text-center">
                    <h2 className="mb-4 text-3xl font-bold">See it in action</h2>
                    <p className="mb-8 text-lg text-[#a0a0c0]">
                        Canonica is in private beta. Request access and we will set up a guided walkthrough.
                    </p>
                    <CanonicaLink
                        basePath={basePath}
                        href="/get-started"
                        className="inline-block rounded-xl bg-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600"
                    >
                        Request Early Access
                    </CanonicaLink>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
