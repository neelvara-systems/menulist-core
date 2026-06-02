'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import SectionHeader from './SectionHeader';

type PreviewTab = 'Product setup' | 'Key product pages' | 'Widget install' | 'Feedback review' | 'Answer review';

type CardItem = {
    title: string;
    state: string;
    detail: string;
};

type RowItem = {
    title: string;
    meta: string;
    result: string;
};

type PreviewConfig = {
    tab: PreviewTab;
    route: string;
    sidebarActive: string;
    badge: string;
    badgeTone: 'emerald' | 'sky' | 'teal' | 'amber';
    leftEyebrow: string;
    leftTitle: string;
    leftStatus: string;
    leftItems: CardItem[];
    rightEyebrow: string;
    rightTitle: string;
    context: string;
    question: string;
    answer: string;
    answerTags: string[];
    queueEyebrow: string;
    queueTitle: string;
    queueRows: RowItem[];
};

const TABS: PreviewTab[] = ['Product setup', 'Key product pages', 'Widget install', 'Feedback review', 'Answer review'];

const BADGE_CLASS: Record<PreviewConfig['badgeTone'], string> = {
    emerald: 'bg-emerald-500/10 text-emerald-300',
    sky: 'bg-sky-500/10 text-sky-300',
    teal: 'bg-teal-500/10 text-teal-200',
    amber: 'bg-amber-500/10 text-amber-300',
};

const CHAPTER_COPY: Record<PreviewTab, {
    kicker: string;
    title: string;
    description: string;
    proof: string[];
}> = {
    'Product setup': {
        kicker: 'Setup',
        title: 'Start with launch readiness.',
        description: 'Show buyers that AnswerLattice begins with product profile, starter knowledge, mapped surfaces, widget verification, and compiled context readiness.',
        proof: ['Workspace ready', 'Sources in review', 'Context verified'],
    },
    'Key product pages': {
        kicker: 'Surfaces',
        title: 'Map support to the pages where users ask.',
        description: 'The proof flow should make page context obvious: billing, onboarding, settings, releases, and error states all carry their own support coverage.',
        proof: ['Route aware', 'Coverage visible', 'Gaps ranked'],
    },
    'Widget install': {
        kicker: 'Widget',
        title: 'Keep the runtime controlled.',
        description: 'The install story stays serious: one script, allowed origins, blocked routes, bounded context, and cache-first runtime delivery.',
        proof: ['Origin locked', 'Routes blocked', 'Context bounded'],
    },
    'Feedback review': {
        kicker: 'Signals',
        title: 'Turn user friction into review work.',
        description: 'Feedback is not a public roadmap promise. It stays private, surface-linked, and useful only when the owner chooses what should become support work.',
        proof: ['Private review', 'Board handoff', 'No auto-publish'],
    },
    'Answer review': {
        kicker: 'Governance',
        title: 'Approve answers before they become authority.',
        description: 'The final chapter reinforces the core doctrine: fallback can create draft improvements, but approved answers stay human-reviewed.',
        proof: ['Canonical-first', 'Drift visible', 'Owner approval'],
    },
};

const PREVIEWS: Record<PreviewTab, PreviewConfig> = {
    'Product setup': {
        tab: 'Product setup',
        route: 'app.answerlattice.com/workspace/activation',
        sidebarActive: 'Activation',
        badge: 'Live preview',
        badgeTone: 'emerald',
        leftEyebrow: 'Activation Command Center',
        leftTitle: 'Launch checklist active',
        leftStatus: 'Runtime verified',
        leftItems: [
            { title: 'Product profile', state: 'Complete', detail: 'Company, product, support email' },
            { title: 'Knowledge import', state: 'In review', detail: 'Docs, FAQ, release notes' },
            { title: 'Product surfaces', state: 'Live', detail: 'Billing, onboarding, team settings' },
            { title: 'Widget install', state: 'Verified', detail: 'Origin, route, context check' },
            { title: 'Compiled context', state: 'Ready', detail: 'Public widget context generated for runtime' },
        ],
        rightEyebrow: 'End-user widget',
        rightTitle: 'Billing page support',
        context: 'billing_invoices',
        question: 'Why was I charged today?',
        answer: 'AnswerLattice found an approved billing answer for this page, then linked the invoice FAQ and latest pricing release note.',
        answerTags: ['Owner-approved', 'FAQ linked', 'Release aware'],
        queueEyebrow: 'Signal-to-knowledge queue',
        queueTitle: 'Review what support exposed',
        queueRows: [
            { title: 'Compiled context manifest', meta: 'Bundle v42', result: 'Ready' },
            { title: 'Billing downgrade question', meta: 'Signal cluster', result: 'Draft answer' },
            { title: 'Invoice retry confusion', meta: 'Ticket fallback', result: 'Needs review' },
        ],
    },
    'Key product pages': {
        tab: 'Key product pages',
        route: 'app.answerlattice.com/workspace/product-surfaces',
        sidebarActive: 'Product surfaces',
        badge: 'Starter routes',
        badgeTone: 'sky',
        leftEyebrow: 'Product surfaces',
        leftTitle: 'Support mapped by route',
        leftStatus: 'Coverage visible',
        leftItems: [
            { title: 'billing_invoices', state: 'Mapped', detail: 'FAQs, release notes, and ticket fallback linked' },
            { title: 'team_settings', state: 'Scoped', detail: 'Role and permission support context attached' },
            { title: 'onboarding_checklist', state: 'Ready for review', detail: 'Setup import workflow and FAQs connected' },
            { title: 'usage_limits_release', state: 'Drift watch', detail: 'Release changed plan limit guidance' },
        ],
        rightEyebrow: 'Related support',
        rightTitle: 'Billing route context',
        context: '/settings/billing/invoices',
        question: 'What help appears on this screen?',
        answer: 'Articles, FAQs, changelogs, tickets, and approved answers are grouped by the route where users ask the question.',
        answerTags: ['Route aware', 'Article linked', 'Ticket fallback'],
        queueEyebrow: 'Surface gaps',
        queueTitle: 'Pages that need better coverage',
        queueRows: [
            { title: 'Usage limits page', meta: 'Release touched', result: 'Review answer' },
            { title: 'Team invite page', meta: 'Low coverage', result: 'Add FAQ' },
            { title: 'Import failed state', meta: 'Error entity', result: 'Draft guide' },
        ],
    },
    'Widget install': {
        tab: 'Widget install',
        route: 'app.answerlattice.com/workspace/widget',
        sidebarActive: 'Widget',
        badge: 'Install ready',
        badgeTone: 'teal',
        leftEyebrow: 'Widget controls',
        leftTitle: 'One script, governed runtime',
        leftStatus: 'Origin locked',
        leftItems: [
            { title: 'Allowed origins', state: '2 domains', detail: 'Only approved product domains can render support' },
            { title: 'Blocked routes', state: '5 rules', detail: 'Hide widget on auth, checkout, or sensitive pages' },
            { title: 'Appearance', state: 'Configured', detail: 'Launcher copy, color, placement, and mobile behavior' },
            { title: 'Safe context', state: 'Bounded', detail: 'Route, feature, workflow, role, and plan hints only' },
            { title: 'Bundle bootstrap', state: 'Cache first', detail: 'Ready context pointers returned with config' },
        ],
        rightEyebrow: 'Widget result',
        rightTitle: 'Page-aware answer',
        context: 'safe page context',
        question: 'Can a teammate manage billing?',
        answer: 'The widget uses the current Team Settings route to prefer permission-specific support, then falls back to ticket capture only when approved knowledge is missing.',
        answerTags: ['Allowed origin', 'Blocked routes', 'Safe context'],
        queueEyebrow: 'Runtime checks',
        queueTitle: 'Install confidence',
        queueRows: [
            { title: 'Script loaded', meta: 'Widget key prefix', result: 'Verified' },
            { title: 'Origin matched', meta: 'help.yourapp.com', result: 'Allowed' },
            { title: 'Context accepted', meta: 'Route payload', result: 'Sanitized' },
            { title: 'Bundle path', meta: 'Versioned JSON', result: 'Cached' },
        ],
    },
    'Feedback review': {
        tab: 'Feedback review',
        route: 'app.answerlattice.com/workspace/feedback',
        sidebarActive: 'Feedback',
        badge: 'Owner review',
        badgeTone: 'sky',
        leftEyebrow: 'Feedback review',
        leftTitle: 'End-user signals stay visible',
        leftStatus: 'Signal-ready',
        leftItems: [
            { title: 'Overall rating', state: '2 stars', detail: 'User says billing setup is unclear' },
            { title: 'Product area', state: 'Billing', detail: 'Attached to invoices and upgrade flow context' },
            { title: 'Feature request', state: 'Requested', detail: 'Ask for clearer failed-payment guidance' },
            { title: 'Suggestion', state: 'Captured', detail: 'Owner can decide whether it needs follow-up' },
            { title: 'Support Board', state: 'Optional', detail: 'Selected feedback can become a private board card' },
        ],
        rightEyebrow: 'Owner action',
        rightTitle: 'Turn feedback into support work',
        context: 'feedback signal',
        question: 'Should this become reusable support knowledge?',
        answer: 'The owner reviews the feedback, links it to the right product surface, and moves only useful items into Support Board or answer proposal review.',
        answerTags: ['Owner-reviewed', 'Surface-linked', 'No auto-publish'],
        queueEyebrow: 'Feedback signals',
        queueTitle: 'What users are telling support',
        queueRows: [
            { title: 'Billing setup confusion', meta: 'Low rating', result: 'Board card' },
            { title: 'Export request', meta: 'Feature request', result: 'Review later' },
            { title: 'Onboarding wording', meta: 'Suggestion', result: 'Draft FAQ' },
        ],
    },
    'Answer review': {
        tab: 'Answer review',
        route: 'app.answerlattice.com/workspace/governance',
        sidebarActive: 'Governance',
        badge: 'Human review',
        badgeTone: 'amber',
        leftEyebrow: 'Answer review',
        leftTitle: 'Coverage and trust stay visible',
        leftStatus: 'Nightly checked',
        leftItems: [
            { title: 'Canonical coverage', state: 'Tracked', detail: 'Known questions resolved by approved answers' },
            { title: 'Drift pressure', state: 'Medium', detail: 'Release touched billing and usage-limit answers' },
            { title: 'Trust readiness', state: 'Ready', detail: 'Critical surfaces have reviewed fallback paths' },
            { title: 'Support-day check', state: 'Due today', detail: 'Workspace timezone and EOD decide the governance window' },
            { title: 'Mutation proposals', state: 'Open', detail: 'Draft improvements waiting for owner review' },
        ],
        rightEyebrow: 'Canonical answer review',
        rightTitle: 'Draft before publish',
        context: 'billing_retry_policy',
        question: 'Should this fallback become official?',
        answer: 'AnswerLattice can draft the better answer, but it does not become authoritative until a human approves it.',
        answerTags: ['Draft only', 'Drift flagged', 'Owner approval'],
        queueEyebrow: 'Governance queue',
        queueTitle: 'What needs owner attention',
        queueRows: [
            { title: 'Invoice retry wording', meta: 'Signal cluster', result: 'Approve draft' },
            { title: 'Usage limit release', meta: 'Version mismatch', result: 'Review drift' },
            { title: 'Team role billing scope', meta: 'Scope conflict', result: 'Adjust answer' },
        ],
    },
};

const SIDEBAR_ITEMS = ['Activation', 'Product surfaces', 'Knowledge Base', 'Widget', 'Tickets', 'Feedback', 'Governance', 'Metrics'];

function PreviewCards({ items }: { items: CardItem[] }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
                <div key={item.title} className="rounded-xl border border-white/[0.06] bg-[#070714] p-4">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-white">{item.title}</span>
                        <span className="text-xs text-emerald-300">{item.state}</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-[#808099]">{item.detail}</p>
                </div>
            ))}
        </div>
    );
}

function QueueRows({ rows }: { rows: RowItem[] }) {
    return (
        <div className="space-y-2">
            {rows.map((row) => (
                <div key={row.title} className="rounded-xl border border-white/[0.06] bg-[#070714] p-3">
                    <div className="text-sm font-semibold text-white">{row.title}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-white/[0.04] px-2 py-1 text-[#808099]">{row.meta}</span>
                        <span className="rounded-full bg-teal-500/10 px-2 py-1 text-teal-200">{row.result}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function ProductPreviewFrame({
    id,
    preview,
}: {
    id: string;
    preview: PreviewConfig;
}) {
    return (
        <div id={id} className="rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3">
            <div className="overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#0d0d22]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.025] px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#06d6a0]" />
                    </div>
                    <div className="hidden rounded-full border border-white/[0.08] bg-[#070714] px-4 py-1.5 text-xs text-[#808099] sm:block">
                        {preview.route}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE_CLASS[preview.badgeTone]}`}>
                        {preview.badge}
                    </span>
                </div>

                <div className="grid min-h-[34rem] lg:grid-cols-[15rem_1fr]">
                    <aside className="hidden border-r border-white/[0.06] bg-[#080818] p-4 lg:block">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-sm font-bold text-white">A</div>
                            <div>
                                <div className="text-sm font-semibold text-white">AnswerLattice</div>
                                <div className="text-xs text-[#6b6b8a]">Workspace</div>
                            </div>
                        </div>
                        <nav className="space-y-2 text-sm">
                            {SIDEBAR_ITEMS.map((label) => (
                                <div
                                    key={label}
                                    className={`rounded-xl px-3 py-2 ${label === preview.sidebarActive ? 'bg-teal-500/15 text-white' : 'text-[#808099]'}`}
                                >
                                    {label}
                                </div>
                            ))}
                        </nav>
                    </aside>

                    <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.05fr_0.95fr] lg:p-6">
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-5">
                                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">{preview.leftEyebrow}</div>
                                        <h3 className="mt-1 text-2xl font-semibold text-white">{preview.leftTitle}</h3>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE_CLASS[preview.badgeTone]}`}>
                                        {preview.leftStatus}
                                    </span>
                                </div>
                                <PreviewCards items={preview.leftItems} />
                            </div>

                            <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-5">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">{preview.queueEyebrow}</div>
                                        <h3 className="mt-1 text-lg font-semibold text-white">{preview.queueTitle}</h3>
                                    </div>
                                    <span className="text-xs text-[#808099]">{preview.queueRows.length} items</span>
                                </div>
                                <QueueRows rows={preview.queueRows} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-5">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">{preview.rightEyebrow}</div>
                                        <h3 className="mt-1 text-lg font-semibold text-white">{preview.rightTitle}</h3>
                                    </div>
                                    <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-200">{preview.context}</span>
                                </div>
                                <div className="rounded-2xl border border-white/[0.06] bg-[#070714] p-4">
                                    <div className="rounded-xl bg-white/[0.04] p-4">
                                        <div className="text-sm font-semibold text-white">{preview.question}</div>
                                        <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">{preview.answer}</p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {preview.answerTags.map((label) => (
                                                <span key={label} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-[#d6d6ef]">
                                                    {label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mt-4 w-full rounded-xl bg-teal-700 px-4 py-3 text-center text-sm font-semibold text-white">
                                        Ask AnswerLattice
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-5">
                                <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">Selected mode</div>
                                <div className="rounded-2xl border border-white/[0.06] bg-[#070714] p-4">
                                    <h3 className="text-lg font-semibold text-white">{preview.tab}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">
                                        This sample state changes the route, sidebar highlight, readiness panel, widget result, and review queue so buyers can understand the connected workspace before final product media is captured.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ProductPreviewSection() {
    const [activeTab, setActiveTab] = useState<PreviewTab>('Product setup');
    const preview = useMemo(() => PREVIEWS[activeTab], [activeTab]);
    const chapterRefs = useRef<Record<PreviewTab, HTMLButtonElement | null>>({
        'Product setup': null,
        'Key product pages': null,
        'Widget install': null,
        'Feedback review': null,
        'Answer review': null,
    });

    useEffect(() => {
        if (typeof IntersectionObserver !== 'function') return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntry = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
                const tab = visibleEntry?.target.getAttribute('data-preview-tab') as PreviewTab | null;

                if (tab && PREVIEWS[tab]) {
                    setActiveTab(tab);
                }
            },
            {
                rootMargin: '-28% 0px -42% 0px',
                threshold: [0.2, 0.45, 0.65],
            }
        );

        TABS.forEach((tab) => {
            const node = chapterRefs.current[tab];
            if (node) observer.observe(node);
        });

        return () => observer.disconnect();
    }, []);

    const handleChapterClick = (tab: PreviewTab) => {
        setActiveTab(tab);
        const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        chapterRefs.current[tab]?.scrollIntoView({
            block: 'center',
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
    };

    return (
        <section className="relative border-y border-white/[0.06] bg-[radial-gradient(circle_at_50%_0%,rgba(30,206,255,0.11),transparent_34%),rgba(255,255,255,0.01)] px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Product proof"
                    title="Scroll through the support loop before pricing."
                    description="A controlled sticky walkthrough shows setup readiness, mapped product pages, widget install, feedback review, and approved-answer review without turning the buyer journey into a flashy product tour."
                />

                <div className="grid gap-8 lg:grid-cols-[minmax(19rem,0.36fr)_minmax(0,1fr)] lg:items-start">
                    <div>
                        <div className="hidden space-y-5 lg:block" role="tablist" aria-label="AnswerLattice product proof chapters">
                            {TABS.map((tab, index) => {
                                const chapter = CHAPTER_COPY[tab];
                                const active = tab === activeTab;

                                return (
                                    <button
                                        key={tab}
                                        ref={(node) => {
                                            chapterRefs.current[tab] = node;
                                        }}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        aria-controls="answerlattice-product-preview"
                                        data-preview-tab={tab}
                                        onClick={() => handleChapterClick(tab)}
                                        className={`min-h-[15rem] w-full rounded-2xl border p-5 text-left transition ${
                                            active
                                                ? 'border-teal-300/35 bg-teal-400/[0.075] shadow-2xl shadow-teal-950/20'
                                                : 'border-white/[0.07] bg-white/[0.025] hover:border-white/[0.16] hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="text-[10px] font-semibold uppercase tracking-widest text-teal-200">
                                                    {String(index + 1).padStart(2, '0')} / {chapter.kicker}
                                                </div>
                                                <h3 className="mt-3 text-xl font-bold leading-tight text-white">{chapter.title}</h3>
                                            </div>
                                            <span className={`mt-1 h-2.5 w-2.5 rounded-full ${active ? 'bg-teal-200' : 'bg-white/20'}`} />
                                        </div>
                                        <p className="mt-4 text-sm leading-relaxed text-[#a0a0c0]">{chapter.description}</p>
                                        <div className="mt-5 flex flex-wrap gap-2">
                                            {chapter.proof.map((item) => (
                                                <span key={item} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-[#d6d6ef]">
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mb-8 flex gap-2 overflow-x-auto pb-2 lg:hidden" role="tablist" aria-label="AnswerLattice product preview">
                            {TABS.map((tab) => {
                                const active = tab === activeTab;
                                return (
                                    <button
                                        key={tab}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        aria-controls="answerlattice-product-preview"
                                        onClick={() => setActiveTab(tab)}
                                        className={`whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                                            active
                                                ? 'border-white/20 bg-white/[0.13] text-white shadow-lg shadow-teal-500/10'
                                                : 'border-transparent bg-white/[0.03] text-[#8f8faa] hover:border-white/[0.12] hover:text-white'
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="lg:sticky lg:top-28">
                        <ProductPreviewFrame id="answerlattice-product-preview" preview={preview} />
                    </div>
                </div>

                <div className="mt-6 grid gap-3 text-sm text-[#808099] md:grid-cols-3">
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="font-semibold text-white">Screens are connected by surfaces</div>
                        <p className="mt-2">Articles, FAQs, changelogs, tickets, and widget answers share page and workflow context.</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="font-semibold text-white">Fallback becomes review work</div>
                        <p className="mt-2">Missed questions become signals and draft improvements instead of disappearing into chat history.</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="font-semibold text-white">Runtime paths stay cost-aware</div>
                        <p className="mt-2">Compiled context and summaries reduce repeated reads in the real product; this website scene itself uses local tab state and no AnswerLattice data.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
