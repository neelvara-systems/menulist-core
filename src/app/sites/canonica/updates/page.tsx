import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaPageStructuredData from '../components/PageStructuredData';

export const metadata: Metadata = {
    title: 'Updates',
    description: 'Canonica product updates that affect setup, team access, page-aware support, owner Q&A, Support Board, hosted help, widget runtime, governance, pricing, and safety.',
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
        date: 'May 27, 2026',
        title: 'Support Board added to the public support-control story',
        items: [
            'Support Board now has a dedicated product page for private support cards, internal notes, status history, assignee context, and governed answer-proposal handoff.',
            'Support Control, FAQ, Resources, route metadata, and agent-readable context now explain the board as a manual-first owner workboard, not as a duplicate ticket inbox.',
            'Ticket/signal sync and nightly board preparation remain controlled rollout claims, so the public website does not imply every workspace pays for duplicated source reads by default.',
        ],
    },
    {
        date: 'May 26, 2026',
        title: 'Owner Q&A now appears in the public support story',
        items: [
            'FAQ Management now explains both manual custom Q&A and article-backed FAQ suggestions.',
            'Homepage, Product, Widget, Support Control, FAQ, and agent-readable pages now describe the implemented answer path: canonical answers first, published owner FAQ answers next, then fallback when coverage is missing.',
            'The website keeps this inside the existing FAQ Management page instead of adding a duplicate feature page, because the runtime and owner UI already manage these answers as one FAQ/custom-answer workflow.',
        ],
    },
    {
        date: 'May 26, 2026',
        title: 'Team access and workspace roles added to the product story',
        items: [
            'Canonica now has a dedicated Team Access product page for workspace members, Canonica roles, custom permissions, owner reset, and force sign-out.',
            'Launch Setup, Product, Get Started, FAQ, Pricing, Resources, Security, and Privacy copy now include team access where it affects buyer evaluation and production readiness.',
            'The public story keeps team access inside Canonica workspace controls, with email setup, owner-managed passcodes, reset, and force sign-out.',
        ],
    },
    {
        date: 'May 25, 2026',
        title: 'Widget screenshot support clarified across the website',
        items: [
            'The widget story now includes user-initiated screenshot upload or paste for visual support context.',
            'Install, Security, FAQ, Quickstarts, and widget pages clarify that Canonica does not automatically capture the host app screen or scrape DOM.',
            'Public copy keeps screenshot support inside the existing page-aware widget and safety story instead of adding a separate product page.',
        ],
    },
    {
        date: 'May 25, 2026',
        title: 'Compiled context and daily governance added to the public product story',
        items: [
            'Product and security pages now explain approved runtime context as versioned, cache-first bundles instead of repeated database scans.',
            'The owner-facing readiness story now includes compiled context status, stale-state repair, and manual rebuild controls from Activation.',
            'Daily governance is described as workspace-local and centralized, using each workspace timezone and support-day end time before repair or review work runs.',
            'Agent context remains controlled rollout copy only; public pages do not promise general MCP access or agent-side knowledge writes.',
        ],
    },
    {
        date: 'May 24, 2026',
        title: 'Workflow notifications and proactive help added to the public product story',
        items: [
            'Slack and email workflow notifications now have a dedicated Integrations page plus a Workflow Notifications product page.',
            'The website now explains digest-first delivery, test notification, compact health, and bounded delivery without marketing broader adapters as generally available.',
            'Proactive Help now has a dedicated product page and is described as configured, page-aware prompts tied to active triggers and approved support summaries.',
        ],
    },
    {
        date: 'May 24, 2026',
        title: 'Website reframed for AI-built SaaS founders',
        items: [
            'Homepage now starts from the post-launch problem: users need correct answers after a founder ships an app quickly with AI.',
            'The page-aware demo now appears as the first proof, showing generic AI vs Canonica before deeper product architecture.',
            'A new AI-built SaaS use-case page explains the setup path, while the vibe-coded SaaS URL stays a canonicalized campaign/search alias.',
        ],
    },
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
            'Homepage copy moved toward founder-facing support accuracy before deeper architecture.',
            'The claim stays scoped to Canonica truth: approved page-aware answers before fallback, reviewable fixes for missed questions, and human approval before authoritative publishing.',
            'Copy avoids "we handle your support" because Canonica is not a helpdesk replacement, outsourcing service, or AI autopilot.',
        ],
    },
    {
        date: 'May 22, 2026',
        title: 'Website reframed around approved page-aware support',
        items: [
            'Hero now leads with approved page-aware support and makes the page-aware demo the primary action.',
            'Homepage now includes a closed-loop visual: product-page question, approved answer, fallback signal, human-reviewed proposal, and future approved answer.',
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
            <main className="cn-page-flow">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Updates</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Canonica product updates.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        Changes that affect setup, page-aware support, hosted help, widget runtime, governance, pricing, and safety.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-4xl">
                        <div className="space-y-6">
                            {UPDATES.map((update) => (
                                <article key={`${update.date}-${update.title}`} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                                    <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-200">{update.date}</div>
                                    <h2 className="text-2xl font-semibold text-white">{update.title}</h2>
                                    <ul className="mt-5 space-y-3">
                                        {update.items.map((item) => (
                                            <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#a0a0c0]">
                                                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-300" />
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
