import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaLink from '../components/CanonicaLink';
import { CanonicaHubDiagram } from '../components/CanonicaFlowDiagram';
import { CanonicaStatusBoard } from '../components/CanonicaProofBlocks';
import CanonicaPageStructuredData from '../components/PageStructuredData';
import { CANONICA_SITE_URL } from '../siteConfig';

export const metadata: Metadata = {
    title: 'Security',
    description: 'Security for Canonica page-aware support: safe page hints, explicit screenshot attachments, allowed origins, blocked routes, compiled context, scoped workspaces, and owner-approved answers.',
    alternates: { canonical: '/security' },
    openGraph: {
        title: 'Security | Canonica',
        description: 'How Canonica protects page-aware support, widget context, and customer workspaces.',
        url: `${CANONICA_SITE_URL}/security`,
    },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const CONTROLS = [
    {
        title: 'Account-scoped data',
        body: 'Canonica documents use product, account, and workspace scope so support knowledge, tickets, widget settings, and summaries stay tied to the correct workspace.',
    },
    {
        title: 'Safe widget context',
        body: 'Widget context is designed for page, route, feature, workflow, role, and plan hints. It is bounded and should not include secrets, tokens, passwords, payment card data, or unrelated personal information.',
    },
    {
        title: 'Explicit screenshot attachments',
        body: 'Users can attach or paste screenshots when visual context helps. Canonica does not automatically capture the host page, scrape the DOM, or write widget images to persistent storage.',
    },
    {
        title: 'Origin and route controls',
        body: 'Workspace owners can configure allowed origins and blocked routes so the widget appears only where the product owner wants it.',
    },
    {
        title: 'Hosted help domain registry',
        body: 'Hosted help domains resolve through Canonica-owned registry documents so anonymous docs, FAQ, changelog, robots, and sitemap pages never depend on client-supplied tenant IDs.',
    },
    {
        title: 'Ticket debugging context',
        body: 'Tickets can include a capped, sanitized snapshot of recent browser context at creation time so owners can debug broken screens without asking customers for technical details.',
    },
    {
        title: 'Owner-approved authority',
        body: 'Generated drafts, entity candidates, and mutation proposals require human review before they become active approved answers.',
    },
    {
        title: 'Compiled context boundary',
        body: 'Ready runtime bundles contain approved public-safe context for the widget and server-only private context for authenticated paths. Drafts, tickets, audit logs, API keys, and raw signals stay out.',
    },
    {
        title: 'Bounded logging',
        body: 'Operational logs are meant for reliability, failure analysis, and abuse protection. Production flows should avoid storing raw sensitive payloads.',
    },
    {
        title: 'Separate product infrastructure',
        body: 'Canonica is maintained as a separate product from MenuList, with Canonica-owned dashboard routes, constants, schedulers, widget configuration, and Firebase data.',
    },
];

const SECURITY_FACTS = [
    { label: 'Product data boundary', value: 'Canonica workspace scope' },
    { label: 'Runtime database', value: 'Canonica Firebase project' },
    { label: 'Widget key storage', value: 'Hashed; encrypted recovery when configured' },
    { label: 'Widget placement', value: 'Allowed origins + blocked routes' },
    { label: 'Screenshot input', value: 'Manual attachment only' },
    { label: 'Hosted help', value: 'Registry-scoped domains' },
    { label: 'Ticket context', value: 'Capped and sanitized' },
    { label: 'Answer authority', value: 'Owner-reviewed approved answers' },
    { label: 'Runtime context', value: 'Versioned approved bundles' },
    { label: 'Expensive requests', value: 'Rate-limited endpoints' },
    { label: 'Scheduler output', value: 'Local EOD + compact summaries' },
    { label: 'MenuList relationship', value: 'Separate product boundary' },
];

const TRUST_AREAS = [
    {
        title: 'Workspace isolation',
        body: 'Canonica management routes resolve a Canonica product account and workspace before reading or writing workspace data.',
        points: [
            'Canonica documents use product, account, and workspace scope.',
            'Dashboard APIs check Canonica scope before mutations.',
            'Canonica Firebase rules default to deny and allow tenant-scoped access explicitly.',
        ],
    },
    {
        title: 'Widget runtime control',
        body: 'The widget is designed to be installed on selected product pages, not sprayed across every route by default.',
        points: [
            'Widget keys are stored as hashes after creation.',
            'Allowed origins restrict where runtime config can be used.',
            'Blocked routes let owners hide the launcher on sensitive screens.',
            'Malformed cn_* keys are rejected before expensive lookup work.',
        ],
    },
    {
        title: 'Hosted public help',
        body: 'Canonica can publish reviewed support content on support domains without exposing authenticated support operations.',
        points: [
            'Domain registry docs resolve workspace scope server-side.',
            'Anonymous pages render published docs, FAQ, changelog, robots, and sitemap only.',
            'Tickets, chat history, feedback writes, and account data stay out of hosted help.',
        ],
    },
    {
        title: 'Ticket debugging context',
        body: 'Canonica keeps ticket debugging context useful by tying it to the reported issue instead of broad background collection.',
        points: [
            'Recent browser context is captured only when a ticket is created.',
            'The payload is capped and intended for debugging the reported issue.',
            'Support teams see context in the ticket instead of asking users to describe browser-level details.',
        ],
    },
    {
        title: 'Bounded page context',
        body: 'Canonica treats page context as a hint for support relevance, not as trusted identity or tenant authority.',
        points: [
            'Context should describe page, route, feature, workflow, role, or plan.',
            'Secrets, tokens, passwords, payment card data, and unrelated personal data should not be sent.',
            'Server-side validation keeps tenant scope separate from client-provided context.',
        ],
    },
    {
        title: 'Explicit visual context',
        body: 'Screenshots can help explain a broken screen, but they should remain a deliberate user action instead of background collection.',
        points: [
            'Users upload or paste screenshots only when they want to include visual context.',
            'The widget does not automatically capture the host app screen or scrape the DOM.',
            'Image inputs are bounded by type and size, and widget images are not stored as persistent files.',
        ],
    },
    {
        title: 'Governed answers',
        body: 'Support correctness comes from approved knowledge, not automatic rewriting.',
        points: [
            'Canonical answers are served before fallback.',
            'Drafts and mutation proposals remain review work until approved.',
            'Drift and signal checks surface stale or missing knowledge.',
        ],
    },
    {
        title: 'Cost and abuse controls',
        body: 'Canonica keeps high-cost and public runtime paths bounded so one noisy widget cannot become an uncontrolled backend workload.',
        points: [
            'Public widget config, search, and feedback endpoints are rate limited.',
            'Repeated canonical hits can use cache with freshness checks.',
            'Ready widget context can be served through versioned bundles and server cache instead of raw collection fanout.',
            'Dashboards prefer summary documents over broad collection scans.',
            'Hosted help content uses cached public payloads and compact display fields.',
        ],
    },
    {
        title: 'Compiled context separation',
        body: 'Canonica separates governed source data from runtime context so public and authenticated consumers receive only the approved fields they need.',
        points: [
            'Governed source records remain inside Canonica for drafts, tickets, signals, proposals, and audit state.',
            'Public widget bundles include only public-safe product and support context.',
            'Private server bundles stay behind authenticated Canonica APIs.',
            'A stale or failed build does not replace the last ready bundle.',
        ],
    },
    {
        title: 'Scheduler cost boundary',
        body: 'Daily governance work is centralized and workspace-aware rather than split into many scheduled functions.',
        points: [
            'The scheduler evaluates due workspaces by local timezone and support-day end time.',
            'Source-version checks decide whether compiled context needs repair.',
            'Summary documents keep owner dashboards readable without large scans.',
        ],
    },
    {
        title: 'Operational separation',
        body: 'Canonica shares a codebase with MenuList, but its product data and support runtime are maintained as a separate product.',
        points: [
            'Canonica has product-owned routes, constants, schedulers, and dashboard sections.',
            'Canonica Firebase config can run separately from MenuList Firebase.',
            'MenuList is a client/use case, not a hardcoded Canonica dependency.',
        ],
    },
];

export default function CanonicaSecurityPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaPageStructuredData path="/security" />
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Security</p>
                        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Security for page-aware support.</h1>
                        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                            Canonica uses safe page hints, explicit screenshot attachments, allowed origins, blocked routes, compiled approved context, scoped workspaces, and owner-approved answers so support can be helpful without collecting secrets.
                        </p>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto mb-12 max-w-3xl rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.055] p-6 text-center">
                        <h2 className="text-2xl font-bold text-white">What to remember</h2>
                        <p className="mt-3 text-sm leading-relaxed text-[#d6d6ef]">
                            Install the widget only on allowed domains, hide it from sensitive routes, send safe page context instead of secrets, keep screenshots user-initiated, serve approved runtime context from controlled bundles, and approve support answers before they become official.
                        </p>
                        <CanonicaLink
                            basePath={basePath}
                            href="/security-one-pager"
                            className="mt-5 inline-flex rounded-xl border border-white/[0.12] bg-white/[0.035] px-5 py-2.5 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.24] hover:text-white"
                        >
                            Open security one-pager
                        </CanonicaLink>
                    </div>
                    <div className="mx-auto mb-16 max-w-7xl">
                        <div className="mb-8 text-center">
                            <h2 className="text-2xl font-bold text-white">Security at a glance</h2>
                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#808099]">
                                The same shared infrastructure discipline used by MenuList is applied here, but Canonica keeps its own product boundary, widget runtime, and support-knowledge controls.
                            </p>
                        </div>
                        <CanonicaHubDiagram
                            idPrefix="cn-security-boundary"
                            inputLabel="Product app"
                            outputLabel="Protected surfaces"
                            inputs={[
                                {
                                    title: 'Allowed origin',
                                    detail: 'Widget config loads only from approved product and staging domains.',
                                },
                                {
                                    title: 'Safe page context',
                                    detail: 'Route, feature, workflow, role, and plan hints guide support without secrets.',
                                },
                                {
                                    title: 'Blocked routes',
                                    detail: 'Auth, payment, admin, or sensitive pages can hide the launcher.',
                                },
                            ]}
                            outputs={[
                                {
                                    title: 'Workspace scope',
                                    detail: 'Support knowledge stays tied to the correct Canonica workspace.',
                                },
                                {
                                    title: 'Hosted help boundary',
                                    detail: 'Public docs, FAQ, changelog, robots, and sitemap render without account data.',
                                },
                                {
                                    title: 'Owner-approved authority',
                                    detail: 'Drafts and proposals require review before becoming official answers.',
                                },
                                {
                                    title: 'Compiled context',
                                    detail: 'Runtime bundles expose approved context, not raw tickets, drafts, audit logs, or API keys.',
                                },
                            ]}
                        />
                    </div>

                    <div className="mx-auto mb-16 max-w-5xl">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {SECURITY_FACTS.map((fact) => (
                                <div key={fact.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                    <div className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">{fact.label}</div>
                                    <div className="mt-2 text-sm font-semibold text-[#d6d6ef]">{fact.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mx-auto max-w-6xl">
                        <CanonicaStatusBoard
                            items={CONTROLS.map((control, index) => ({
                                status: [
                                    'scope',
                                    'context',
                                    'image',
                                    'route',
                                    'public help',
                                    'ticket',
                                    'review',
                                    'compiled',
                                    'logging',
                                    'separate product',
                                ][index] ?? 'control',
                                title: control.title,
                                detail: control.body,
                                tone: index === 1 || index === 2 || index === 8 ? 'caution' as const : index === 0 || index === 6 || index === 7 ? 'good' as const : 'neutral' as const,
                            }))}
                        />
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-3xl rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Page context boundary</p>
                        <h2 className="text-2xl font-bold text-white">Do not send secrets through page context.</h2>
                        <p className="mt-4 text-sm leading-relaxed text-[#a0a0c0]">
                            Use page, route, feature, workflow, role, plan, or state names. Do not send passwords, tokens, payment data, private customer records, or unrelated personal data. If users attach a screenshot, keep it deliberate and avoid pages that show secrets.
                        </p>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-5xl">
                        <div className="mb-10 max-w-3xl">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Trust controls</p>
                            <h2 className="text-3xl font-bold text-white">What Canonica protects by design</h2>
                            <p className="mt-4 text-sm leading-relaxed text-[#a0a0c0]">
                                These controls map to the implemented Canonica runtime: dashboard APIs, widget config, widget search, feedback, tenant-scoped rules, summaries, and owner review queues.
                            </p>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                            {TRUST_AREAS.map((area) => (
                                <article key={area.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                                    <h3 className="text-lg font-semibold text-white">{area.title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{area.body}</p>
                                    <ul className="mt-5 space-y-2 border-t border-white/[0.06] pt-4">
                                        {area.points.map((point) => (
                                            <li key={point} className="flex gap-3 text-sm leading-relaxed text-[#808099]">
                                                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                                                <span>{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-3xl rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
                        <h2 className="mb-3 text-xl font-semibold text-white">Security and responsible disclosure</h2>
                        <p className="mb-4 text-sm leading-relaxed text-[#a0a0c0]">
                            Report security, privacy, or data-handling concerns to the Canonica team. Do not include secrets, production credentials, or full customer data in the first message.
                        </p>
                        <a href="mailto:hello@canonica.app" className="text-sm font-semibold text-indigo-300 hover:text-indigo-200">
                            hello@canonica.app
                        </a>
                    </div>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
