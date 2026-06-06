import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import { AnswerlatticeHubDiagram } from '../components/AnswerlatticeFlowDiagram';
import { AnswerlatticeStatusBoard } from '../components/AnswerlatticeProofBlocks';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';
import SectionHeader from '../components/SectionHeader';
import { ANSWERLATTICE_SITE_URL } from '../siteConfig';

export const metadata: Metadata = {
    title: 'Security',
    description: 'Security for the AnswerLattice support layer: safe page hints, explicit screenshots, bounded source intake, allowed origins, blocked routes, compiled context, scoped workspaces, role permissions, and owner-approved answers.',
    alternates: { canonical: '/security' },
    openGraph: {
        title: 'Security | AnswerLattice',
        description: 'How AnswerLattice protects in-app support, widget context, hosted help, approved answers, and customer workspaces.',
        url: `${ANSWERLATTICE_SITE_URL}/security`,
    },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

const CONTROLS = [
    {
        title: 'Account-scoped data',
        body: 'AnswerLattice documents use product, account, and workspace scope so support knowledge, tickets, widget settings, and summaries stay tied to the correct workspace.',
    },
    {
        title: 'Role-scoped workspace access',
        body: 'AnswerLattice workspace members receive AnswerLattice-specific permission claims so team, billing, widget, knowledge, support, and answer-review controls can be separated by role.',
    },
    {
        title: 'Owner reset and sign-out',
        body: 'Workspace owners can create a new temporary passcode and force sign-out for managed team members when access needs to be refreshed.',
    },
    {
        title: 'Safe widget context',
        body: 'Widget context is designed for page, route, feature, workflow, role, and plan hints. It is bounded and should not include secrets, tokens, passwords, payment card data, or unrelated personal information.',
    },
    {
        title: 'Explicit screenshot attachments',
        body: 'Users can attach or paste screenshots when visual context helps. AnswerLattice does not automatically capture the host page, scrape the DOM, or write widget images to persistent storage.',
    },
    {
        title: 'Bounded source intake',
        body: 'Knowledge Intake accepts selected public links, supported files, screenshots, and short recordings as owner-provided evidence. URL import is bounded, media work is capped and credit logged, and raw media is not retained by default.',
    },
    {
        title: 'Origin and route controls',
        body: 'Workspace owners can configure allowed origins and blocked routes so the widget appears only where the product owner wants it.',
    },
    {
        title: 'Hosted help domain registry',
        body: 'Hosted help domains resolve through AnswerLattice-owned registry documents so anonymous docs, FAQ, changelog, robots, and sitemap pages never depend on client-supplied tenant IDs.',
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
        body: 'AnswerLattice uses AnswerLattice-owned dashboard routes, constants, schedulers, widget configuration, and workspace data boundaries.',
    },
];

const SECURITY_FACTS = [
    { label: 'Product data boundary', value: 'AnswerLattice workspace scope' },
    { label: 'Team permissions', value: 'AnswerLattice role claims' },
    { label: 'Owner reset path', value: 'Passcode reset + sign-out' },
    { label: 'Runtime database', value: 'AnswerLattice Firebase project' },
    { label: 'Widget key storage', value: 'Hashed; encrypted recovery when configured' },
    { label: 'Widget placement', value: 'Allowed origins + blocked routes' },
    { label: 'Screenshot input', value: 'Manual attachment only' },
    { label: 'Source intake', value: 'Owner-selected and capped' },
    { label: 'Hosted help', value: 'Registry-scoped domains' },
    { label: 'Ticket context', value: 'Capped and sanitized' },
    { label: 'Answer authority', value: 'Owner-reviewed approved answers' },
    { label: 'Runtime context', value: 'Versioned approved bundles' },
    { label: 'Expensive requests', value: 'Rate-limited endpoints' },
    { label: 'Scheduler output', value: 'Local EOD + compact summaries' },
    { label: 'Product boundary', value: 'AnswerLattice workspace scope' },
];

const TRUST_AREAS = [
    {
        title: 'Workspace isolation',
        body: 'AnswerLattice management routes resolve an AnswerLattice product account and workspace before reading or writing workspace data.',
        points: [
            'AnswerLattice documents use product, account, and workspace scope.',
            'Dashboard APIs check AnswerLattice scope before mutations.',
            'AnswerLattice Firebase rules default to deny and allow tenant-scoped access explicitly.',
        ],
    },
    {
        title: 'Team permissions',
        body: 'AnswerLattice team access uses product-specific roles for support, knowledge, widget, billing, answer review, and workspace controls.',
        points: [
            'Owner, Manager, Support Staff, and custom roles map to AnswerLattice permission keys.',
            'Dashboard routes and protected AnswerLattice APIs check the active role before exposing controls.',
            'Password/passcode reset and force sign-out revoke active sessions for sensitive access changes.',
        ],
    },
    {
        title: 'Widget runtime control',
        body: 'The widget is designed to be installed on selected product pages, not sprayed across every route by default.',
        points: [
            'Widget keys are stored as hashes after creation.',
            'Allowed origins restrict where runtime config can be used.',
            'Blocked routes let owners hide the launcher on sensitive screens.',
            'Malformed al_* keys are rejected before expensive lookup work.',
        ],
    },
    {
        title: 'Hosted public help',
        body: 'AnswerLattice can publish reviewed support content on support domains without exposing authenticated support operations.',
        points: [
            'Domain registry docs resolve workspace scope server-side.',
            'Anonymous pages render published docs, FAQ, changelog, robots, and sitemap only.',
            'Tickets, chat history, feedback writes, and account data stay out of hosted help.',
        ],
    },
    {
        title: 'Ticket debugging context',
        body: 'AnswerLattice keeps ticket debugging context useful by tying it to the reported issue instead of broad background collection.',
        points: [
            'Recent browser context is captured only when a ticket is created.',
            'The payload is capped and intended for debugging the reported issue.',
            'Support teams see context in the ticket instead of asking users to describe browser-level details.',
        ],
    },
    {
        title: 'Bounded page context',
        body: 'AnswerLattice treats page context as a hint for support relevance, not as trusted identity or tenant authority.',
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
        title: 'Knowledge intake boundary',
        body: 'Intake is designed to teach AnswerLattice from selected sources without creating a crawler, private connector, or automatic publishing path.',
        points: [
            'Public URL discovery imports only owner-selected pages.',
            'Files are capped before processing; screenshots and short recordings are extracted into support text.',
            'Paid OCR and transcription work is support-credit logged and refund-aware on failure.',
            'Accepted output publishes through existing KB, FAQ, surface, changelog, or approved-answer proposal workflows.',
        ],
    },
    {
        title: 'Reviewed answers',
        body: 'Support correctness comes from approved knowledge, not automatic rewriting.',
        points: [
            'Approved answers are served before fallback.',
            'Drafts and mutation proposals remain review work until approved.',
            'Stale-answer and signal checks surface stale or missing knowledge.',
        ],
    },
    {
        title: 'Cost and abuse controls',
        body: 'AnswerLattice keeps high-cost and public runtime paths bounded so one noisy widget cannot become an uncontrolled backend workload.',
        points: [
            'Public widget config, search, and feedback endpoints are rate limited.',
            'Repeated approved-answer hits can use cache with freshness checks.',
            'Ready widget context can be served through versioned bundles and server cache instead of raw collection fanout.',
            'Dashboards prefer summary documents over broad collection scans.',
            'Hosted help content uses cached public payloads and compact display fields.',
        ],
    },
    {
        title: 'Compiled context separation',
        body: 'AnswerLattice separates reviewed source data from runtime context so public and authenticated consumers receive only the approved fields they need.',
        points: [
            'Source records remain inside AnswerLattice for drafts, tickets, signals, proposals, and audit state.',
            'Public widget bundles include only public-safe product and support context.',
            'Private server bundles stay behind authenticated AnswerLattice APIs.',
            'A stale or failed build does not replace the last ready bundle.',
        ],
    },
    {
        title: 'Scheduler cost boundary',
        body: 'Daily support review work is centralized and workspace-aware rather than split into many scheduled functions.',
        points: [
            'The scheduler evaluates due workspaces by local timezone and support-day end time.',
            'Source-version checks decide whether compiled context needs repair.',
            'Summary documents keep owner dashboards readable without large scans.',
        ],
    },
    {
        title: 'Operational separation',
        body: 'AnswerLattice keeps its product data and support runtime bounded to AnswerLattice workspace, widget, hosted help, and answer review surfaces.',
        points: [
            'AnswerLattice has product-owned routes, constants, schedulers, and dashboard sections.',
            'AnswerLattice Firebase config can run as dedicated product infrastructure.',
            'Client products are integrations, not hardcoded AnswerLattice dependencies.',
        ],
    },
];

export default function AnswerlatticeSecurityPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/security" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Security</p>
                        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Security for support inside your product.</h1>
                        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                            AnswerLattice uses safe page hints, explicit screenshot attachments, bounded source intake, allowed origins, blocked routes, compiled approved context, role-scoped workspaces, and owner-approved answers so support can be helpful without collecting secrets.
                        </p>
                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/security-one-pager"
                                className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                            >
                                Open one-pager
                            </AnswerlatticeLink>
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/quickstarts"
                                className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                            >
                                View install safety
                            </AnswerlatticeLink>
                        </div>
                        <PageProofStrip
                            className="mt-8 text-left"
                            items={[
                                { label: 'Widget', value: 'Allowed origins, blocked routes, safe context' },
                                { label: 'Sources', value: 'Owner-selected intake, capped media extraction' },
                                { label: 'Authority', value: 'Owner-approved answers before official guidance' },
                            ]}
                        />
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto mb-12 max-w-3xl rounded-2xl border border-teal-300/20 bg-teal-500/[0.055] p-6 text-center">
                        <h2 className="text-2xl font-bold text-white">What to remember</h2>
                        <p className="mt-3 text-sm leading-relaxed text-[#d6d6ef]">
                            Install the widget only on allowed domains and hide it from sensitive routes. Send safe page context instead of secrets. Keep screenshots user-initiated, use selected sources for Knowledge Intake, and approve support answers before they become official.
                        </p>
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/security-one-pager"
                            className="mt-5 inline-flex rounded-xl border border-white/[0.12] bg-white/[0.035] px-5 py-2.5 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.24] hover:text-white"
                        >
                            Open security one-pager
                        </AnswerlatticeLink>
                    </div>
                    <div className="mx-auto mb-16 max-w-7xl">
                        <div className="mb-8 text-center">
                            <h2 className="text-2xl font-bold text-white">Security at a glance</h2>
                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#808099]">
                                AnswerLattice is built around product-owned workspace boundaries, widget runtime controls, and reviewed support-knowledge access.
                            </p>
                        </div>
                        <AnswerlatticeHubDiagram
                            idPrefix="al-security-boundary"
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
                                    detail: 'Support knowledge stays tied to the correct AnswerLattice workspace.',
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
                        <AnswerlatticeStatusBoard
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
                    <div className="mx-auto mb-6 max-w-3xl rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Source intake boundary</p>
                        <h2 className="text-2xl font-bold text-white">Import selected evidence, not everything.</h2>
                        <p className="mt-4 text-sm leading-relaxed text-[#a0a0c0]">
                            Use public product or docs pages you select, supported files, screenshots, and short recordings that are safe to process. AnswerLattice does not crawl an entire private app, retain raw media by default, or make generated intake output official without owner review.
                        </p>
                    </div>
                    <div className="mx-auto max-w-3xl rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Page context boundary</p>
                        <h2 className="text-2xl font-bold text-white">Do not send secrets through page context.</h2>
                        <p className="mt-4 text-sm leading-relaxed text-[#a0a0c0]">
                            Use page, route, feature, workflow, role, plan, or state names. Do not send passwords, tokens, payment data, private customer records, or unrelated personal data. If users attach a screenshot, keep it deliberate and avoid pages that show secrets.
                        </p>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-5xl">
                        <SectionHeader
                            eyebrow="Trust controls"
                            title="What AnswerLattice protects by design"
                            description="These controls map to the implemented AnswerLattice runtime: dashboard APIs, widget config, widget search, feedback, tenant-scoped rules, summaries, and owner review queues."
                        />
                        <div className="grid gap-4 lg:grid-cols-2">
                            {TRUST_AREAS.map((area) => (
                                <article key={area.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                                    <h3 className="text-lg font-semibold text-white">{area.title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{area.body}</p>
                                    <ul className="mt-5 space-y-2 border-t border-white/[0.06] pt-4">
                                        {area.points.map((point) => (
                                            <li key={point} className="flex gap-3 text-sm leading-relaxed text-[#808099]">
                                                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-300" />
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
                            Report security, privacy, or data-handling concerns to the AnswerLattice team. Do not include secrets, production credentials, or full customer data in the first message.
                        </p>
                        <a href="mailto:hello@answerlattice.com" className="text-sm font-semibold text-teal-200 hover:text-teal-100">
                            hello@answerlattice.com
                        </a>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
