import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaPageStructuredData from '../components/PageStructuredData';

export const metadata: Metadata = {
    title: 'Updates',
    description: 'Recent Canonica product updates across launch setup, widget management, public website, governance, and cost-conscious runtime work.',
    alternates: { canonical: '/updates' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const UPDATES = [
    {
        date: 'May 22, 2026',
        title: 'Final product-suite website polish',
        items: [
            'The header Product menu now opens into the four main Canonica product areas: Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance.',
            'Homepage, resources, SEO landing pages, and role use-case pages now cross-link those product areas so buyers can evaluate Canonica by capability.',
            'The polish stays static and adds no Firestore reads, Cloud Function calls, or runtime dependencies to normal website browsing.',
        ],
    },
    {
        date: 'May 22, 2026',
        title: 'Product areas now have landing-style pages',
        items: [
            'Launch Setup, Page-Aware Widget, Support Control, and Knowledge Governance now each have their own product page.',
            'Each page includes a hero, product-area tabs, large browser-style product canvas, bento benefit grid, workflow steps, and conversion CTA.',
            'The product overview now links to those pages so buyers can evaluate each major Canonica capability independently.',
        ],
    },
    {
        date: 'May 22, 2026',
        title: 'Homepage product proof redesigned',
        items: [
            'The page-aware demo now uses a horizontal product-page tab row with one large product canvas below it, so the aha moment is easier to scan.',
            'The product proof section now presents Canonica like a real dashboard screenshot with clearer operator tabs before the framed interface.',
            'The widget section is now a bento-style grid covering runtime answer, install script, allowed origins, blocked routes, hosted help, page context, and support-gap review.',
        ],
    },
    {
        date: 'May 22, 2026',
        title: 'Founder-facing support accuracy positioning',
        items: [
            'Homepage hero now leads with "You build revenue. Canonica keeps support accurate." so founders understand the outcome before the architecture.',
            'The claim stays scoped to Canonica truth: approved page-aware answers before fallback, reviewable fixes for missed questions, and human approval before authoritative publishing.',
            'Copy avoids "we handle your support" because Canonica is not a helpdesk replacement, outsourcing service, or AI autopilot.',
        ],
    },
    {
        date: 'May 22, 2026',
        title: 'Website reframed around page-aware support truth',
        items: [
            'Hero now leads with page-aware support truth and makes the page-aware demo the primary action.',
            'Homepage now includes a closed-loop visual: product-page question, approved answer, fallback signal, human-reviewed proposal, and future canonical answer.',
            'Comparison now separates AI chatbot, helpdesk, knowledge base, and Canonica so the product is not misread as another support chatbot.',
            'FAQ now defines canonical answers, missing-answer behavior, non-chatbot positioning, and human approval before authoritative publishing.',
            'Role-specific use-case pages added for founders, support teams, product teams, and engineering without adding Firebase reads.',
        ],
    },
    {
        date: 'May 22, 2026',
        title: 'Product proof moved into the homepage decision path',
        items: [
            'Homepage now shows a large Canonica workflow scene directly after the hero, covering activation, product surfaces, page-aware widget output, and signal-to-knowledge review.',
            'The product page now reuses the same visual proof before the architecture sections so buyers see the owner workflow before reading the control-plane details.',
            'The scene is responsive HTML/CSS rather than a static screenshot, so it avoids private workspace data, stays mobile-friendly, and keeps website browsing at zero Firebase cost.',
        ],
    },
    {
        date: 'May 22, 2026',
        title: 'Homepage conversion flow rebuilt around buyer questions',
        items: [
            'Hero now leads with page-aware support from the exact product page where the user is stuck.',
            'Homepage now includes an embedded generic-vs-Canonica demo, best-fit/not-fit guidance, 10-minute setup path, security-at-a-glance controls, pricing preview, and top founder objections.',
            'Pricing, install, get-started, and use-case pages now explain support credits, developer handoff, first-session checklist, and concrete before/after support examples.',
            'Three static SEO pages added for page-aware widget, hosted help center, and solo-founder support use cases without adding Firebase reads.',
        ],
    },
    {
        date: 'May 22, 2026',
        title: 'Main website content sharpened for buyer-facing trust',
        items: [
            'Custom help domains such as help.yourapp.com are now presented as a first-class hosted-help benefit.',
            'Ticket debugging context is now described as capped, sanitized support context instead of raw technical logging.',
            'Security, FAQ, privacy, product, install, and homepage copy now explain those benefits without exposing internal tenant or store details.',
        ],
    },
    {
        date: 'May 22, 2026',
        title: 'Hosted help, FAQ, billing, and public-site refresh',
        items: [
            'Hosted Help added for docs, FAQ, changelog, robots, and sitemap on support domains such as help.yourapp.com.',
            'Article-backed FAQ generation and FAQ management are now part of the public product story.',
            'Canonica billing now uses product-scoped plans, support credits, transactions, and Razorpay flows from the Canonica dashboard.',
            'Website copy refreshed around Launch Setup, Support Control, Knowledge Governance, and the cost-conscious runtime layer.',
        ],
    },
    {
        date: 'May 22, 2026',
        title: 'Public runtime cache and security hardening',
        items: [
            'Public KB, FAQ, changelog, and hosted-help content now use cached compact payloads with owner-write invalidation.',
            'Search cache freshness now uses source-version manifests so repeated answers can be fast without serving stale content.',
            'Direct production access to the internal hosted-help rewrite route is blocked; hosted help renders through registered domains.',
        ],
    },
    {
        date: 'May 21, 2026',
        title: 'Canonica system inventory and product website map',
        items: [
            'Codebase-first Canonica system inventory added under docs.',
            'Homepage now shows Launch Setup, Support Control, Knowledge Governance, and Runtime Layer.',
            'Website claims now focus on enabled core flows and keep rollout-only API and adapter work out of buyer copy.',
        ],
    },
    {
        date: 'May 21, 2026',
        title: 'Self-sellable public website',
        items: [
            'Public demo, security, FAQ, privacy, and terms pages added.',
            'Starter, Growth, and Studio pricing copy aligned for small SaaS buyers.',
            'Canonica sitemap, robots, manifest, icons, and structured data added.',
        ],
    },
    {
        date: 'May 21, 2026',
        title: 'Launch and governance control plane',
        items: [
            'Activation Command Center added with summary-backed readiness.',
            'Product surfaces added for route/page/workflow context mapping.',
            'Trust metrics and tenant-summary scheduler discovery wired for lower Firestore cost.',
        ],
    },
    {
        date: 'May 19, 2026',
        title: 'Widget management',
        items: [
            'Widget key generation, allowed origins, blocked routes, appearance, behavior, and install snippets added.',
            'Runtime config endpoint added so installed widgets can read dashboard settings without script edits.',
        ],
    },
];

export default function CanonicaUpdatesPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaPageStructuredData path="/updates" />
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Updates</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Canonica product movement, without the noise.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        Recent changes that affect launch readiness, page-aware support, governance, widget operations, and public product clarity.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-4xl">
                        <div className="space-y-6">
                            {UPDATES.map((update) => (
                                <article key={`${update.date}-${update.title}`} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                                    <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-300">{update.date}</div>
                                    <h2 className="text-2xl font-semibold text-white">{update.title}</h2>
                                    <ul className="mt-5 space-y-3">
                                        {update.items.map((item) => (
                                            <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#a0a0c0]">
                                                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-20 text-center">
                    <h2 className="text-3xl font-bold">Want to see the product instead?</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-[#a0a0c0]">
                        The static demo shows how Canonica changes support by product page without using production data.
                    </p>
                    <CanonicaLink
                        basePath={basePath}
                        href="/demo"
                        data-canonica-event="updates_cta_clicked"
                        data-canonica-label="try_demo"
                        className="mt-8 inline-block rounded-xl border border-white/[0.1] bg-white/[0.03] px-8 py-3.5 text-sm font-semibold text-[#d6d6ef] transition-all hover:border-white/[0.2] hover:text-white"
                    >
                        Try page-aware demo
                    </CanonicaLink>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
