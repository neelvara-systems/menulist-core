'use client';

import { useMemo, useState } from 'react';

type DemoSurfaceKey = 'billing' | 'onboarding' | 'settings' | 'release';
type DemoResultType = 'canonical' | 'fallback' | 'gap';

type DemoSurface = {
    key: DemoSurfaceKey;
    label: string;
    route: string;
    contextKey: string;
    question: string;
};

type DemoAnswer = {
    type: DemoResultType;
    title: string;
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
        route: '/settings/billing/invoices',
        contextKey: 'billing_invoices',
        question: 'Why did my invoice fail?',
    },
    {
        key: 'onboarding',
        label: 'Onboarding',
        route: '/setup/import',
        contextKey: 'onboarding_import',
        question: 'What should I upload first?',
    },
    {
        key: 'settings',
        label: 'Team settings',
        route: '/settings/team',
        contextKey: 'team_settings',
        question: 'Can a teammate manage billing?',
    },
    {
        key: 'release',
        label: 'New release',
        route: '/releases/usage-limits',
        contextKey: 'release_usage_limits',
        question: 'Did usage limits change?',
    },
];

const ANSWERS: Record<DemoSurfaceKey, DemoAnswer> = {
    billing: {
        type: 'canonical',
        title: 'Verified billing answer',
        answer: 'Invoice retries happen automatically for 3 days. If the card still fails, update the payment method from Billing, then retry the invoice from the invoice details page.',
        status: 'Canonical answer served first',
        related: ['Update payment method', 'Invoice retry policy', 'Billing permissions'],
        changelog: 'May 2026 billing retry update',
        nextAction: 'No ticket needed unless payment still fails after retry.',
    },
    onboarding: {
        type: 'canonical',
        title: 'Page-aware onboarding answer',
        answer: 'Start with your public docs, setup guide, and top 10 recurring support questions. Canonica will create entity candidates and draft answers for review.',
        status: 'Matched by product surface context',
        related: ['Import knowledge', 'Entity candidates', 'Canonical answer drafts'],
        nextAction: 'Upload docs, then review generated drafts in Knowledge Governance.',
    },
    settings: {
        type: 'fallback',
        title: 'Fallback answer with review signal',
        answer: 'Team members can be given support-management access, but billing owner permissions are not fully covered by approved knowledge yet.',
        status: 'Fallback used because canonical coverage is incomplete',
        related: ['Team roles', 'Workspace permissions'],
        nextAction: 'Canonica adds this recurring gap to the signal-to-knowledge queue.',
    },
    release: {
        type: 'gap',
        title: 'Release impact gap found',
        answer: 'A release note changed usage limits, but the related support answer has not been reviewed after that release.',
        status: 'Stale answer risk detected',
        related: ['Usage limits', 'Plan quotas', 'Release impact checks'],
        changelog: 'Usage limits release note',
        nextAction: 'Review the affected canonical answer before users receive old quota guidance.',
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

export default function CanonicaPublicDemo() {
    const [surfaceKey, setSurfaceKey] = useState<DemoSurfaceKey>('billing');
    const surface = useMemo(() => SURFACES.find((item) => item.key === surfaceKey) || SURFACES[0], [surfaceKey]);
    const answer = ANSWERS[surface.key];
    const meta = TYPE_META[answer.type];

    return (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Choose product page</p>
                <div className="grid gap-3">
                    {SURFACES.map((item) => {
                        const active = item.key === surfaceKey;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setSurfaceKey(item.key)}
                                className={`rounded-xl border p-4 text-left transition ${
                                    active
                                        ? 'border-indigo-400/50 bg-indigo-500/10'
                                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.16]'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-semibold text-white">{item.label}</span>
                                    <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] text-[#a0a0c0]">{item.contextKey}</span>
                                </div>
                                <div className="mt-2 text-xs text-[#70708f]">{item.route}</div>
                                <div className="mt-3 text-sm text-[#a0a0c0]">{item.question}</div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#111124] p-4 shadow-2xl shadow-black/20 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Canonica widget result</p>
                        <h2 className="mt-1 text-2xl font-bold text-white">{surface.label}</h2>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}>
                        {meta.label}
                    </span>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                    <div className="mb-3 rounded-lg bg-indigo-500 px-4 py-3 text-sm font-medium text-white">
                        {surface.question}
                    </div>
                    <div className="rounded-lg bg-white px-4 py-4 text-[#1a1a2e]">
                        <div className="mb-2 text-sm font-semibold">{answer.title}</div>
                        <p className="m-0 text-sm leading-relaxed text-[#374151]">{answer.answer}</p>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#70708f]">Status</div>
                        <p className="m-0 text-sm leading-relaxed text-[#d6d6ef]">{answer.status}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#70708f]">Next action</div>
                        <p className="m-0 text-sm leading-relaxed text-[#d6d6ef]">{answer.nextAction}</p>
                    </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#70708f]">Related support truth</div>
                    <div className="flex flex-wrap gap-2">
                        {answer.related.map((item) => (
                            <span key={item} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-[#d6d6ef]">{item}</span>
                        ))}
                        {answer.changelog && (
                            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">{answer.changelog}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
