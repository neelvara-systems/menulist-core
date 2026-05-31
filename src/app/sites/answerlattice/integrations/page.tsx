import { Metadata } from 'next';
import { headers } from 'next/headers';
import {
    LuBell,
    LuCheckCircle,
    LuClock3,
    LuMail,
    LuMessageSquare,
    LuShieldCheck,
    LuSlidersHorizontal,
    LuZap,
} from 'react-icons/lu';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import { AnswerlatticeSequenceDiagram } from '../components/AnswerlatticeFlowDiagram';
import SectionHeader from '../components/SectionHeader';
import { ANSWERLATTICE_SITE_URL } from '../siteConfig';

export const metadata: Metadata = {
    title: 'Integrations',
    description:
        'Slack and email workflow notifications for Answerlattice support governance: digest-first alerts, test delivery, compact health, and bounded delivery.',
    alternates: { canonical: '/integrations' },
    openGraph: {
        title: 'Integrations | Answerlattice',
        description:
            'Notify owners about support governance movement without turning every support event into alert noise.',
        url: `${ANSWERLATTICE_SITE_URL}/integrations`,
    },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

const DELIVERY_CARDS = [
    {
        icon: LuMessageSquare,
        title: 'Slack alerts',
        description: 'Send owner-approved governance movement to a Slack channel through a workspace webhook.',
    },
    {
        icon: LuMail,
        title: 'Email recipients',
        description: 'Send the same support events to owner or team inboxes when Slack is not the team habit.',
    },
    {
        icon: LuClock3,
        title: 'Digest-first delivery',
        description: 'Routine drift, gaps, proposals, and summaries can stay grouped instead of becoming noise.',
    },
    {
        icon: LuZap,
        title: 'Critical alerts',
        description: 'Coverage drops and repeated answer failures can alert sooner when owner attention is needed.',
    },
    {
        icon: LuCheckCircle,
        title: 'Send test notification',
        description: 'Verify a destination from settings and record the latest delivery result before launch.',
    },
    {
        icon: LuShieldCheck,
        title: 'Bounded delivery',
        description: 'Rate caps, health summaries, and retention policies keep notification work production-safe.',
    },
];

const EVENT_ROWS = [
    ['Nightly digest', 'A compact summary of coverage, drift, gaps, and review movement.'],
    ['Coverage drop', 'A higher-priority alert when approved support coverage materially falls.'],
    ['Repeated answer failure', 'A higher-priority alert when the same support path keeps failing users.'],
    ['Test delivery', 'A controlled message for validating Slack or email setup before relying on it.'],
];

export default function AnswerlatticeIntegrationsPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/integrations" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="relative overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(circle_at_50%_0%,rgba(30,206,255,0.12),transparent_38%),rgba(255,255,255,0.01)] px-4 py-20 sm:px-6 lg:py-24">
                    <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
                        <div>
                            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-teal-300">Integrations</p>
                            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                                Notify owners when support truth needs attention.
                            </h1>
                            <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#a0a0c0] sm:text-lg">
                                Answerlattice connects support governance to Slack and email with digest-first notifications, critical alerts, test delivery, and compact delivery health.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <AnswerlatticeLink
                                    basePath={basePath}
                                    href="/product/workflow-notifications"
                                    data-answerlattice-event="integrations_cta_clicked"
                                    data-answerlattice-label="workflow_notifications"
                                    className="rounded-xl bg-teal-700 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                                >
                                    View workflow notifications
                                </AnswerlatticeLink>
                                <AnswerlatticeLink
                                    basePath={basePath}
                                    href="/get-started"
                                    data-answerlattice-event="integrations_cta_clicked"
                                    data-answerlattice-label="start_setup"
                                    className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-center text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                                >
                                    Start support setup
                                </AnswerlatticeLink>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3">
                            <div className="overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#101028] text-white">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.035] px-5 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-[#06d6a0]" />
                                    </div>
                                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                                        Delivery healthy
                                    </span>
                                </div>
                                <div className="grid gap-4 p-5 sm:p-6">
                                    <div className="rounded-2xl border border-teal-300/20 bg-teal-400/10 p-4">
                                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                                            <LuBell aria-hidden size={18} className="text-[#1eceff]" />
                                            Nightly support digest
                                        </div>
                                        <p className="text-sm leading-relaxed text-[#a0a0c0]">
                                            Coverage changed, 3 answers need review, 2 repeated gaps were grouped, and Slack delivery succeeded.
                                        </p>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {[
                                            ['Slack', 'Connected'],
                                            ['Email', '2 recipients'],
                                            ['Last test', 'Succeeded'],
                                            ['Failures', '0 consecutive'],
                                        ].map(([label, value]) => (
                                            <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                                                <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8f8faa]">{label}</div>
                                                <div className="mt-2 text-lg font-bold text-white">{value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-b border-white/[0.06] bg-white/[0.01] px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <SectionHeader
                            eyebrow="What can notify"
                            title="Alerts for review work, not raw logs."
                            description="The owner should know when support needs attention. They should not have to read integration event streams."
                        />
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {DELIVERY_CARDS.map((card) => {
                                const Icon = card.icon;
                                return (
                                    <article key={card.title} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-6">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05] text-[#1eceff]">
                                            <Icon aria-hidden size={20} />
                                        </span>
                                        <h3 className="mt-5 text-lg font-semibold text-white">{card.title}</h3>
                                        <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{card.description}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="border-b border-white/[0.06] px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-6xl">
                        <SectionHeader
                            eyebrow="Owner controls"
                            title="Configure destination, filters, and confidence."
                            description="Slack and email are self-service. Broader workflow adapters should remain controlled rollout until credential handling, tenant authorization, and delivery behavior are ready for every workspace."
                        />
                        <div className="mx-auto max-w-3xl rounded-[1.75rem] border border-white/[0.08] bg-[#101028] p-5">
                            <div className="mb-5 flex items-center gap-2">
                                <LuSlidersHorizontal aria-hidden className="text-[#1eceff]" />
                                <h3 className="text-lg font-bold text-white">Event filters</h3>
                            </div>
                            <div className="space-y-3">
                                {EVENT_ROWS.map(([label, description]) => (
                                    <div key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                                        <div className="text-sm font-semibold text-white">{label}</div>
                                        <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">{description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-b border-white/[0.06] bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.10),transparent_36%),rgba(255,255,255,0.01)] px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <SectionHeader
                            eyebrow="Workflow"
                            title="From support movement to owner attention."
                            description="Configure destinations, choose events, send a test, then let critical alerts and digest summaries keep support governance visible."
                        />
                        <AnswerlatticeSequenceDiagram
                            idPrefix="al-integrations-workflow"
                            splitAfter={3}
                            items={[
                                { title: 'Connect Slack or email', detail: 'Add the destination in Answerlattice settings.' },
                                { title: 'Choose event filters', detail: 'Select the governance events that deserve notification.' },
                                { title: 'Send a test', detail: 'Verify delivery before relying on the channel.' },
                                { title: 'Deliver digest or alert', detail: 'Routine movement stays grouped; critical events can alert quickly.' },
                                { title: 'Review health', detail: 'Use last success, last failure, and disabled state without opening raw logs.' },
                            ]}
                        />
                    </div>
                </section>

                <section className="px-4 py-20 text-center sm:px-6">
                    <h2 className="mx-auto max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
                        Keep owners aware without building notification plumbing yourself.
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#a0a0c0]">
                        Start with Slack or email, verify delivery, and keep support review work connected to the Answerlattice dashboard.
                    </p>
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/product/workflow-notifications"
                            className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                        >
                            View workflow notifications
                        </AnswerlatticeLink>
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/demo"
                            className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                        >
                            Try page-aware demo
                        </AnswerlatticeLink>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
