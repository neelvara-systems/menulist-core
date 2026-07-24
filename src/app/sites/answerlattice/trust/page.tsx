import { Metadata } from 'next';
import { headers } from 'next/headers';
import { LuDatabase, LuFileCheck2, LuLock, LuServerCog } from 'react-icons/lu';
import { ANSWERLATTICE_RETENTION_DAYS } from '@data/shared/answerlatticeRetention';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';
import SectionHeader from '../components/SectionHeader';

export const metadata: Metadata = {
    title: 'Trust and Data Handling',
    description: 'Current AnswerLattice infrastructure, service-provider, retention, security-review, and compliance-claim facts for buyers and technical reviewers.',
    alternates: { canonical: '/trust' },
};

async function getBasePath(): Promise<string> {
    try {
        const h = (await headers());
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

const PROVIDER_FACTS = [
    {
        area: 'Application hosting and domains',
        provider: 'Vercel',
        use: 'Serves the AnswerLattice Next.js application and manages configured public and hosted-help domains.',
        dataBoundary: 'Application requests and deployment metadata required to serve the product.',
    },
    {
        area: 'Database, authentication, storage, and functions',
        provider: 'Google Firebase and Google Cloud',
        use: 'Stores workspace data, authenticates product access, holds scoped files and compiled context, and runs AnswerLattice Cloud Functions.',
        dataBoundary: 'QA uses the separate AnswerLattice Firebase project. The separately defined production target still requires deployment and launch certification.',
    },
    {
        area: 'AI-assisted processing',
        provider: 'Google Gemini',
        use: 'Supports configured drafting, extraction, embedding, fallback, and review-assistance paths.',
        dataBoundary: 'Generated output remains draft or fallback material until the applicable review path approves it as support truth.',
    },
    {
        area: 'Billing',
        provider: 'Razorpay',
        use: 'Creates checkout, subscription, and top-up provider records.',
        dataBoundary: 'AnswerLattice stores bounded billing identifiers, status, amount, currency, and lifecycle summaries, not payment-card details.',
    },
    {
        area: 'Email delivery',
        provider: 'Configured SMTP service',
        use: 'Sends selected support and workflow notifications when email delivery is configured.',
        dataBoundary: 'Delivery uses the intended recipient, subject, bounded message content, and compact delivery diagnostics.',
    },
    {
        area: 'Cache and rate limiting',
        provider: 'Upstash Redis when configured',
        use: 'Supports bounded cache and public-request rate-limit paths.',
        dataBoundary: 'The durable workspace source of truth remains in AnswerLattice Firebase.',
    },
    {
        area: 'Public website analytics',
        provider: 'Plausible and Google Analytics when configured',
        use: 'Measures public website activity only after analytics consent.',
        dataBoundary: 'The public website stays on essential behavior when analytics is declined or no measurement setting is configured.',
    },
];

const RETENTION_FACTS = [
    ['Query embedding cache', `${ANSWERLATTICE_RETENTION_DAYS.queryEmbeddings} days`, 'Temporary retrieval cache with expiry and cleanup.'],
    ['Raw answer and search history', `${ANSWERLATTICE_RETENTION_DAYS.aiSearchHistory} days`, 'Bounded runtime trace used for feedback, support gaps, and troubleshooting.'],
    ['Scheduler and notification delivery logs', `${ANSWERLATTICE_RETENTION_DAYS.notificationLogs} days`, 'Compact operational and delivery diagnostics.'],
    ['Notification rate-limit counters', `${ANSWERLATTICE_RETENTION_DAYS.ownerNotificationRateLimits} days`, 'Short-lived abuse and delivery-volume counters.'],
    ['Public contact enquiries', `${ANSWERLATTICE_RETENTION_DAYS.contactEnquiries} days`, 'Buyer or support follow-up records with an expiry field.'],
    ['Signal events', `${ANSWERLATTICE_RETENTION_DAYS.signalEvents} days`, 'Scheduler cleanup bounds the raw signal window.'],
    ['Friction daily statistics', '90 days', 'Compact historical product-friction measurements.'],
    ['Knowledge Intake raw media', 'Not retained after extraction', 'Extracted, redacted source text and review lineage remain until removed or a later lifecycle policy applies.'],
];

const CLAIM_STATUS = [
    {
        label: 'Independent security certification',
        status: 'No public certification claim',
        detail: 'AnswerLattice does not display an independent security certification badge on the basis of product controls alone.',
    },
    {
        label: 'Data Processing Agreement',
        status: 'Not published as a standard public document',
        detail: 'A buyer that requires a DPA should raise that requirement before purchase so legal and provider terms can be reviewed explicitly.',
    },
    {
        label: 'Contractual subprocessor schedule',
        status: 'Not published',
        detail: 'The operational provider map on this page is factual product documentation, not a contractual subprocessor schedule.',
    },
    {
        label: 'Data residency commitment',
        status: 'No public residency promise',
        detail: 'If a specific processing or storage region is mandatory, it must be confirmed as a contractual deployment requirement before purchase.',
    },
    {
        label: 'AI-provider training and zero retention',
        status: 'No public no-training or zero-retention claim',
        detail: 'Those claims depend on the active Gemini billing tier, feature use, abuse-monitoring status, and account configuration. They must be verified against the deployed provider account before purchase or publication.',
    },
    {
        label: 'Full workspace deletion',
        status: 'Handled through a scoped support review',
        detail: 'AnswerLattice does not claim a one-click full-workspace deletion flow. Contact the team to confirm scope, billing state, legal constraints, and deletion evidence.',
    },
];

export default async function AnswerlatticeTrustPage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/trust" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-4xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Trust and data handling</p>
                        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Current facts, including the gaps.</h1>
                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                            This page gives buyers and technical reviewers a codebase-grounded view of AnswerLattice infrastructure, providers, retention, and current compliance claims. It is operational documentation, not a certification or contract.
                        </p>
                        <p className="mt-4 text-sm text-[#6b6b8a]">Last reviewed: July 19, 2026</p>
                        <PageProofStrip
                            className="mx-auto mt-8 max-w-5xl text-left"
                            items={[
                                { label: 'Infrastructure', value: 'Separate QA runtime; production certification still pending' },
                                { label: 'Authority', value: 'Reviewed answers before official support guidance' },
                                { label: 'Disclosure', value: 'No unsupported certification, DPA, or residency claim' },
                            ]}
                        />
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-6xl">
                        <SectionHeader
                            eyebrow="Operational provider map"
                            title="Who supports the current service"
                            description="These are the active or configurable provider categories visible in the AnswerLattice runtime. Contractual terms and geographic processing requirements still need buyer-specific review."
                        />
                        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                            <div className="hidden grid-cols-[0.8fr_0.7fr_1.2fr_1.2fr] gap-4 border-b border-white/[0.07] bg-white/[0.035] px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[#808099] lg:grid">
                                <span>Area</span>
                                <span>Provider</span>
                                <span>Purpose</span>
                                <span>Data boundary</span>
                            </div>
                            {PROVIDER_FACTS.map((fact) => (
                                <article key={fact.area} className="grid gap-3 border-b border-white/[0.06] p-5 last:border-b-0 lg:grid-cols-[0.8fr_0.7fr_1.2fr_1.2fr] lg:gap-4">
                                    <div>
                                        <span className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a] lg:hidden">Area</span>
                                        <p className="mt-1 text-sm font-semibold text-white lg:mt-0">{fact.area}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a] lg:hidden">Provider</span>
                                        <p className="mt-1 text-sm font-semibold text-teal-200 lg:mt-0">{fact.provider}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a] lg:hidden">Purpose</span>
                                        <p className="mt-1 text-sm leading-relaxed text-[#a0a0c0] lg:mt-0">{fact.use}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a] lg:hidden">Data boundary</span>
                                        <p className="mt-1 text-sm leading-relaxed text-[#808099] lg:mt-0">{fact.dataBoundary}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-6xl">
                        <SectionHeader
                            eyebrow="Implemented retention"
                            title="Bounded windows for raw operational data"
                            description="These windows describe implemented product retention controls. Durable workspace truth, approved knowledge, billing state, and extracted source text have different lifecycle requirements."
                        />
                        <div className="grid gap-4 md:grid-cols-2">
                            {RETENTION_FACTS.map(([surface, window, detail]) => (
                                <article key={surface} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
                                    <div className="flex items-start gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-200/10 bg-teal-300/[0.07] text-teal-200">
                                            <LuDatabase aria-hidden size={18} />
                                        </span>
                                        <div>
                                            <h2 className="text-base font-semibold text-white">{surface}</h2>
                                            <p className="mt-1 text-sm font-semibold text-teal-200">{window}</p>
                                            <p className="mt-2 text-sm leading-relaxed text-[#808099]">{detail}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-6xl">
                        <SectionHeader
                            eyebrow="Claim status"
                            title="What is not being claimed"
                            description="Security controls and product separation are evidence. They do not automatically create an audit certification, legal agreement, or residency commitment."
                        />
                        <div className="grid gap-4 lg:grid-cols-2">
                            {CLAIM_STATUS.map((claim, index) => (
                                <article key={claim.label} className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.025] p-6">
                                    <div className="flex items-start gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/10 bg-amber-200/[0.06] text-amber-100">
                                            {index % 2 === 0 ? <LuFileCheck2 aria-hidden size={18} /> : <LuLock aria-hidden size={18} />}
                                        </span>
                                        <div>
                                            <h2 className="text-lg font-semibold text-white">{claim.label}</h2>
                                            <p className="mt-2 text-sm font-semibold text-amber-100">{claim.status}</p>
                                            <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{claim.detail}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1fr_0.9fr]">
                        <article className="rounded-[1.5rem] border border-teal-300/20 bg-teal-500/[0.065] p-7">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-teal-200/15 bg-teal-300/[0.08] text-teal-100">
                                <LuServerCog aria-hidden size={20} />
                            </div>
                            <h2 className="mt-5 text-2xl font-bold text-white">Run a buyer security review</h2>
                            <p className="mt-3 text-sm leading-relaxed text-[#d6d6ef]">
                                Share your required controls, processing regions, legal terms, deletion expectations, and rollout scope before purchase. Requirements that are not documented here are not assumed to be available.
                            </p>
                            <a href="mailto:hello@answerlattice.com?subject=AnswerLattice%20security%20review" className="mt-6 inline-flex min-h-[45px] items-center justify-center rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800">
                                Request security review
                            </a>
                        </article>
                        <article className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.025] p-7">
                            <h2 className="text-2xl font-bold text-white">Supporting documents</h2>
                            <div className="mt-5 grid gap-3">
                                <AnswerlatticeLink basePath={basePath} href="/security" className="min-h-11 rounded-xl border border-white/[0.1] px-4 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.22] hover:text-white">
                                    Full security controls
                                </AnswerlatticeLink>
                                <AnswerlatticeLink basePath={basePath} href="/security-one-pager" className="min-h-11 rounded-xl border border-white/[0.1] px-4 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.22] hover:text-white">
                                    Security and ops one-pager
                                </AnswerlatticeLink>
                                <AnswerlatticeLink basePath={basePath} href="/privacy-policy" className="min-h-11 rounded-xl border border-white/[0.1] px-4 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.22] hover:text-white">
                                    Privacy policy
                                </AnswerlatticeLink>
                            </div>
                        </article>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
