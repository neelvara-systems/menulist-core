'use client';

import { useMemo, useState } from 'react';

type DemoSurfaceKey = 'billing' | 'onboarding' | 'settings' | 'release';
type DemoResultType = 'canonical' | 'fallback' | 'gap';

type DemoSurface = {
    key: DemoSurfaceKey;
    label: string;
    shortLabel: string;
    route: string;
    contextKey: string;
    question: string;
    pageSummary: string;
};

type DemoAnswer = {
    type: DemoResultType;
    title: string;
    genericAnswer: string;
    answer: string;
    status: string;
    related: string[];
    changelog?: string;
    nextAction: string;
};

const SURFACES: DemoSurface[] = [
    {
        key: 'billing',
        label: 'Billing page',
        shortLabel: 'Billing',
        route: '/settings/billing/invoices',
        contextKey: 'billing_invoices',
        question: 'Why did my invoice fail?',
        pageSummary: 'The user is looking at invoice retries, payment method status, and billing ownership.',
    },
    {
        key: 'onboarding',
        label: 'Onboarding',
        shortLabel: 'Onboarding',
        route: '/setup/import',
        contextKey: 'onboarding_import',
        question: 'What should I upload first?',
        pageSummary: 'The user is starting setup and needs the right first knowledge sources.',
    },
    {
        key: 'settings',
        label: 'Team settings',
        shortLabel: 'Team',
        route: '/settings/team',
        contextKey: 'team_settings',
        question: 'Can a teammate manage billing?',
        pageSummary: 'The user is reviewing roles, permissions, and account access.',
    },
    {
        key: 'release',
        label: 'New release',
        shortLabel: 'Release',
        route: '/releases/usage-limits',
        contextKey: 'release_usage_limits',
        question: 'Did usage limits change?',
        pageSummary: 'The user is reading a release note that may change existing support answers.',
    },
];

const ANSWERS: Record<DemoSurfaceKey, DemoAnswer> = {
    billing: {
        type: 'canonical',
        title: 'Verified billing answer',
        genericAnswer: 'Please check your billing settings or contact support if your card was declined.',
        answer: 'Invoice retries happen automatically for 3 days. If the card still fails, update the payment method from Billing, then retry the invoice from the invoice details page.',
        status: 'Canonical answer served first',
        related: ['Update payment method', 'Invoice retry policy', 'Billing permissions'],
        changelog: 'May 2026 billing retry update',
        nextAction: 'No ticket needed unless payment still fails after retry.',
    },
    onboarding: {
        type: 'canonical',
        title: 'Page-aware onboarding answer',
        genericAnswer: 'Upload any document you have and review your setup checklist.',
        answer: 'Start with your public docs, setup guide, and top 10 recurring support questions. Canonica will create entity candidates and draft answers for review.',
        status: 'Matched by product surface context',
        related: ['Import knowledge', 'Entity candidates', 'Canonical answer drafts'],
        nextAction: 'Upload docs, then review generated drafts in Knowledge Governance.',
    },
    settings: {
        type: 'fallback',
        title: 'Fallback answer with review signal',
        genericAnswer: 'Check your team settings to see which permissions are available.',
        answer: 'Team members can be given support-management access, but billing owner permissions are not fully covered by approved knowledge yet.',
        status: 'Fallback used because canonical coverage is incomplete',
        related: ['Team roles', 'Workspace permissions'],
        nextAction: 'Canonica adds this recurring gap to the signal-to-knowledge queue.',
    },
    release: {
        type: 'gap',
        title: 'Release impact gap found',
        genericAnswer: 'Review the latest release notes for information about usage limits.',
        answer: 'A release note changed usage limits, but the related support answer has not been reviewed after that release.',
        status: 'Stale answer risk detected',
        related: ['Usage limits', 'Plan quotas', 'Release impact checks'],
        changelog: 'Usage limits release note',
        nextAction: 'Review the affected approved answer before users receive old quota guidance.',
    },
};

const TYPE_META: Record<DemoResultType, { label: string; className: string }> = {
    canonical: {
        label: 'Canonical',
        className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    },
    fallback: {
        label: 'Fallback',
        className: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    },
    gap: {
        label: 'Support gap',
        className: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
    },
};

const FLOW_BADGES: Record<DemoResultType, string[]> = {
    canonical: ['Page context detected', 'Canonical answer served', 'Related FAQ/release shown'],
    fallback: ['Page context detected', 'Fallback used', 'Gap captured'],
    gap: ['Release context detected', 'Stale answer risk', 'Awaiting human review'],
};

export default function CanonicaPublicDemo() {
    const [surfaceKey, setSurfaceKey] = useState<DemoSurfaceKey>('billing');
    const surface = useMemo(() => SURFACES.find((item) => item.key === surfaceKey) || SURFACES[0], [surfaceKey]);
    const answer = ANSWERS[surface.key];
    const meta = TYPE_META[answer.type];

    return (
        <div className="rounded-[1.75rem] border border-white/[0.08] bg-[radial-gradient(circle_at_50%_0%,rgba(30,206,255,0.10),transparent_36%),rgba(255,255,255,0.025)] p-3 shadow-2xl shadow-black/30 sm:p-4">
            <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-2 sm:justify-center">
                {SURFACES.map((item) => {
                    const active = item.key === surfaceKey;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setSurfaceKey(item.key)}
                            data-canonica-event="demo_surface_changed"
                            data-canonica-label={item.key}
                            className={`min-w-[8.75rem] rounded-full border px-4 py-2.5 text-left text-sm font-semibold transition sm:min-w-0 sm:text-center ${
                                active
                                    ? 'border-white/25 bg-white/[0.13] text-white shadow-lg shadow-indigo-500/10'
                                    : 'border-transparent bg-white/[0.03] text-[#8f8faa] hover:border-white/[0.14] hover:text-white'
                            }`}
                        >
                            {item.shortLabel}
                        </button>
                    );
                })}
            </div>

            <div className="overflow-hidden rounded-[1.35rem] border border-white/[0.1] bg-[#101028] text-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.035] px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#06d6a0]" />
                    </div>
                    <div className="min-w-0 rounded-full border border-white/[0.08] bg-white/[0.05] px-4 py-1.5 text-xs text-[#d6d6ef]">
                        {surface.route}
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}>
                        {meta.label}
                    </span>
                </div>

                <div className="grid lg:grid-cols-[1fr_25rem]">
                    <div className="bg-[#0f0f23] p-5 sm:p-7">
                        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Product screen</p>
                                <h3 className="mt-2 text-3xl font-bold text-white">{surface.label}</h3>
                                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#a0a0c0]">{surface.pageSummary}</p>
                            </div>
                            <span className="rounded-full border border-indigo-300/20 bg-indigo-400/10 px-3 py-1 text-xs font-semibold text-indigo-200">{surface.contextKey}</span>
                        </div>

                        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                            <div className="grid gap-3 md:grid-cols-3">
                                {answer.related.slice(0, 3).map((item) => (
                                    <div key={item} className="rounded-xl border border-white/[0.08] bg-[#101028] p-4">
                                        <div className="text-xs font-semibold uppercase tracking-widest text-[#8f8faa]">Related</div>
                                        <div className="mt-2 text-sm font-semibold text-[#d6d6ef]">{item}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 rounded-2xl bg-[#151729] p-4 text-white">
                                <div className="text-xs font-semibold uppercase tracking-widest text-[#9298b8]">User asks from this page</div>
                                <div className="mt-2 text-xl font-semibold">{surface.question}</div>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                                <div className="text-xs font-semibold uppercase tracking-widest text-[#8f8faa]">Generic chatbot</div>
                                <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{answer.genericAnswer}</p>
                            </div>
                            <div className="rounded-2xl border border-indigo-300/20 bg-indigo-400/10 p-4">
                                <div className="text-xs font-semibold uppercase tracking-widest text-indigo-200">Why Canonica is different</div>
                                <p className="mt-3 text-sm leading-relaxed text-[#d6d6ef]">{answer.status}</p>
                            </div>
                        </div>
                    </div>

                    <aside className="border-t border-white/[0.08] bg-[#0b0b1e] p-5 text-white lg:border-l lg:border-t-0">
                        <div className="mb-5">
                            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Canonica widget result</p>
                            <h3 className="mt-2 text-2xl font-bold">{answer.title}</h3>
                        </div>

                        <div className="mb-5 flex flex-wrap gap-2">
                            {FLOW_BADGES[answer.type].map((badge) => (
                                <span key={badge} className="rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-xs text-[#d6d6ef]">
                                    {badge}
                                </span>
                            ))}
                        </div>

                        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.06] p-5 text-[#d6d6ef]">
                            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-200">Approved answer path</div>
                            <p className="mt-3 text-sm leading-relaxed">{answer.answer}</p>
                        </div>

                        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                            <div className="text-xs font-semibold uppercase tracking-widest text-[#8f8faa]">Next action</div>
                            <p className="mt-3 text-sm leading-relaxed text-[#d6d6ef]">{answer.nextAction}</p>
                        </div>

                        {answer.changelog && (
                            <div className="mt-4 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                                <div className="text-xs font-semibold uppercase tracking-widest text-indigo-200">Release link</div>
                                <p className="mt-2 text-sm text-indigo-100">{answer.changelog}</p>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}
