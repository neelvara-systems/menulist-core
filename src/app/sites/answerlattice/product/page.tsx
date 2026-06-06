import type { IconType } from 'react-icons';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import {
    LuBookOpen,
    LuHelpCircle,
    LuMessageSquare,
    LuRocket,
    LuShieldCheck,
    LuTicket,
} from 'react-icons/lu';
import AnswerlatticeAssetImage from '../components/AnswerlatticeAssetImage';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageHero from '../components/PageHero';
import SectionHeader from '../components/SectionHeader';
import {
    AnswerlatticeCrossDiagram,
    AnswerlatticeHubDiagram,
    AnswerlatticeSequenceDiagram,
} from '../components/AnswerlatticeFlowDiagram';
import {
    ANSWERLATTICE_PRODUCT_AREA_ASSETS,
    ANSWERLATTICE_PRODUCT_PREVIEW_ASSETS,
} from '../answerlatticeWebsiteAssets';
import { ANSWERLATTICE_SUPPORT_FEATURES } from '../productFeatures';

export const metadata: Metadata = {
    title: 'Product',
    description: 'AnswerLattice is the support layer for founder-led SaaS: in-app widget, hosted help, FAQs, changelog, ticket fallback, feedback review, approved answers, and support-gap review.',
    alternates: { canonical: '/product' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

const SUPPORT_LAYER_INPUTS = [
    {
        title: 'What you add',
        detail: 'Docs, FAQs, release notes, support replies, product notes, screenshots, and common questions.',
        meta: 'Sources',
    },
    {
        title: 'Where users ask',
        detail: 'Billing, onboarding, settings, integrations, releases, setup flows, and errors.',
        meta: 'Product pages',
    },
    {
        title: 'What changes',
        detail: 'Launch updates, stale guidance, repeated misses, low ratings, and ticket context.',
        meta: 'Signals',
    },
];

const SUPPORT_LAYER_OUTPUTS = [
    {
        title: 'What users get',
        detail: 'Approved answers, hosted help, related articles, owner answers, or ticket fallback.',
        meta: 'Support',
    },
    {
        title: 'What you review',
        detail: 'Missed questions, stale answers, repeated tickets, feedback, and draft improvements.',
        meta: 'Review queue',
    },
    {
        title: 'What stays connected',
        detail: 'Hosted help, FAQs, changelog, product surfaces, and approved answers move as one support layer.',
        meta: 'Published truth',
    },
];

const OPERATING_MODES: Array<{
    title: string;
    description: string;
    icon: IconType;
    items: string[];
}> = [
    {
        title: 'Launch Setup',
        description: 'Prepare support before users rely on it.',
        icon: LuRocket,
        items: ['Workspace activation', 'Product details', 'Starter knowledge', 'Product surfaces', 'Widget install'],
    },
    {
        title: 'Support Control',
        description: 'Run day-to-day support from one layer.',
        icon: LuHelpCircle,
        items: ['Hosted help', 'Docs and FAQ', 'Tickets', 'Changelog', 'Conversations'],
    },
    {
        title: 'Approved Answer Review',
        description: 'Keep answers trustworthy as the product changes.',
        icon: LuShieldCheck,
        items: ['Approved answers', 'Product map', 'Stale review', 'Signal queue', 'Coverage'],
    },
];

const FEATURE_SECTIONS: Array<{
    eyebrow: string;
    title: string;
    description: string;
    image: keyof typeof ANSWERLATTICE_PRODUCT_AREA_ASSETS;
    icon: IconType;
    bullets: string[];
    reverse?: boolean;
}> = [
    {
        eyebrow: 'In-app widget',
        title: 'Give users help inside your product.',
        description: 'The widget lets users ask from the page where they are stuck. It can use safe page, feature, workflow, role, or locale context to return support that matches the moment.',
        image: 'In-app help widget',
        icon: LuMessageSquare,
        bullets: ['One script install', 'Safe page context', 'Allowed domains', 'Blocked routes', 'Mobile-ready widget'],
    },
    {
        eyebrow: 'Hosted help',
        title: 'Publish a help center without separating support truth.',
        description: 'Give users a support home for docs, FAQs, owner answers, changelog, and common product questions. The help center and widget should work from the same reviewed knowledge.',
        image: 'Help center and tickets',
        icon: LuBookOpen,
        bullets: ['Docs and articles', 'FAQ and owner answers', 'Release notes', 'Custom help domains', 'Ticket fallback'],
        reverse: true,
    },
];

const TRUST_ITEMS = [
    {
        title: 'Product map',
        detail: 'Features, plans, roles, workflows, states, integrations, and errors can become support concepts.',
        meta: 'Context',
    },
    {
        title: 'Approved answers first',
        detail: 'Reviewed answers are served before fallback so users get the same official guidance.',
        meta: 'Authority',
    },
    {
        title: 'Stale answer review',
        detail: 'Releases and support signals can flag guidance that may need owner review.',
        meta: 'Freshness',
    },
    {
        title: 'Repeated-gap queue',
        detail: 'Tickets, ratings, feedback, and recurring fallback become review inputs.',
        meta: 'Improvement',
    },
];

const DIFFERENCE_CARDS = [
    ['Not a generic chatbot', 'Official answers require review before they become support truth.'],
    ['Not static docs', 'Tickets, feedback, and releases show what support knowledge is missing or stale.'],
    ['Not only a help center', 'Users get support inside the product, not only on a separate docs site.'],
    ['Not just ticketing', 'Fallback becomes support improvement work instead of only a queue.'],
    ['Not enterprise helpdesk software', 'Built for founders before a dedicated support team exists.'],
];

const SIGNUP_STEPS = [
    'Create workspace',
    'Add product details',
    'Add starter knowledge',
    'Map product pages',
    'Approve first answers',
    'Install widget',
    'Review support gaps',
];

function ProductSystemVisual() {
    return (
        <div className="rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-4 shadow-2xl shadow-black/35">
            <div className="rounded-[1.5rem] border border-white/[0.08] bg-[#101028] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-teal-200">Support moment</div>
                        <div className="mt-1 text-lg font-bold text-white">User asks from /billing</div>
                    </div>
                    <span className="rounded-full border border-teal-300/20 bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-100">
                        Safe context
                    </span>
                </div>
                <div className="mt-5 grid gap-4">
                    {[
                        ['Widget', 'Question received with page, role, and workflow hints.'],
                        ['Approved answer', 'Billing guidance served before fallback.'],
                        ['Fallback gap', 'Missing policy opens a ticket and review item.'],
                    ].map(([title, detail], index) => (
                        <article key={title} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                            <div className="flex items-start gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-xs font-bold text-teal-200">
                                    {index + 1}
                                </span>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">{title}</h3>
                                    <p className="mt-1 text-sm leading-relaxed text-[#a0a0c0]">{detail}</p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SupportLayerMap() {
    return (
        <section className="px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="System map"
                    title="One support layer across your product, help content, tickets, and review work."
                    description="This is where AnswerLattice stops feeling like one widget. Sources, product moments, user support, and founder review stay connected."
                />
                <div className="rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-4 shadow-2xl shadow-black/30 sm:p-6">
                    <AnswerlatticeHubDiagram
                        idPrefix="al-product-support-layer"
                        inputLabel="What enters"
                        outputLabel="What leaves"
                        inputs={SUPPORT_LAYER_INPUTS}
                        outputs={SUPPORT_LAYER_OUTPUTS}
                    />
                </div>
            </div>
        </section>
    );
}

function OperatingModesSection() {
    return (
        <section className="px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-6xl">
                <SectionHeader
                    eyebrow="Operating modes"
                    title="Three modes for founder-led support."
                    description="The product is easier to understand when each mode has a job: prepare support, operate support, then improve support truth."
                />
                <div className="grid gap-4 lg:grid-cols-3">
                    {OPERATING_MODES.map((mode) => {
                        const Icon = mode.icon;
                        return (
                            <article key={mode.title} className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] p-6">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-200/15 bg-teal-300/[0.08] text-teal-200">
                                    <Icon aria-hidden size={22} />
                                </span>
                                <h3 className="mt-6 text-xl font-semibold text-white">{mode.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{mode.description}</p>
                                <ul className="mt-5 grid gap-2">
                                    {mode.items.map((item) => (
                                        <li key={item} className="flex items-start gap-2 text-sm text-[#d6d6ef]">
                                            <span className="mt-1 text-teal-300">✓</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function FeatureDirectorySection({ basePath }: { basePath: string }) {
    return (
        <section className="px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Support system"
                    title="The pieces founders usually scatter across separate tools."
                    description="Use the detailed pages when you want to inspect the support controls behind the widget, hosted help, tickets, feedback, changelog, and review loop."
                />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    {ANSWERLATTICE_SUPPORT_FEATURES.map((feature) => (
                        <AnswerlatticeLink
                            key={feature.href}
                            basePath={basePath}
                            href={feature.href}
                            className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-teal-300/25 hover:bg-teal-500/[0.04]"
                        >
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-300">
                                {feature.eyebrow}
                            </p>
                            <h3 className="mt-3 text-base font-semibold text-white">{feature.label}</h3>
                            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#8f8faa]">
                                {feature.description}
                            </p>
                        </AnswerlatticeLink>
                    ))}
                </div>
            </div>
        </section>
    );
}

function FeatureSplitSection({ section }: { section: typeof FEATURE_SECTIONS[number] }) {
    const Icon = section.icon;
    const visual = (
        <div className="rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3">
            <AnswerlatticeAssetImage
                asset={ANSWERLATTICE_PRODUCT_AREA_ASSETS[section.image]}
                className="rounded-[1.5rem] border border-white/[0.08]"
            />
        </div>
    );
    const copy = (
        <div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-200/15 bg-teal-300/[0.08] text-teal-200">
                <Icon aria-hidden size={22} />
            </span>
            <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-teal-300">{section.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">{section.title}</h2>
            <p className="mt-5 text-base leading-relaxed text-[#a0a0c0]">{section.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
                {section.bullets.map((item) => (
                    <span key={item} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[#a0a0c0]">
                        {item}
                    </span>
                ))}
            </div>
        </div>
    );

    return (
        <section className="px-4 py-20 sm:px-6">
            <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
                {section.reverse ? (
                    <>
                        {visual}
                        {copy}
                    </>
                ) : (
                    <>
                        {copy}
                        {visual}
                    </>
                )}
            </div>
        </section>
    );
}

function ApprovedAnswersSection() {
    return (
        <section className="px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Answer authority"
                    title="Official answers should be approved, not guessed."
                    description="AI can help draft, but owner review decides what becomes support truth."
                />
                <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                    <article className="rounded-[2rem] border border-white/[0.08] bg-[#101028] p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-200">Approved answer</p>
                                <h3 className="mt-2 text-2xl font-bold text-white">Why did my payment fail?</h3>
                            </div>
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                                Approved
                            </span>
                        </div>
                        <p className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 text-sm leading-relaxed text-[#d6d6ef]">
                            Payment may fail if the card was declined, the billing address does not match, or bank verification is required. Ask the owner to retry the card, confirm the billing address, or contact the bank before opening a support ticket.
                        </p>
                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            {[
                                ['Scope', 'Billing · Owner role'],
                                ['Source', 'Billing FAQ + policy note'],
                                ['Last reviewed', 'May 2026'],
                            ].map(([label, value]) => (
                                <div key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                                    <div className="text-[10px] font-semibold uppercase tracking-widest text-[#8f8faa]">{label}</div>
                                    <div className="mt-2 text-sm font-semibold text-white">{value}</div>
                                </div>
                            ))}
                        </div>
                    </article>
                    <div className="grid gap-4">
                        {[
                            ['AI can draft', 'Drafts help you move faster, but stay in review.'],
                            ['Founder approves', 'Billing, policies, setup, and product behavior stay under your control.'],
                            ['Users get trusted help', 'The widget serves reviewed answers before fallback.'],
                        ].map(([title, detail]) => (
                            <article key={title} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-6">
                                <h3 className="text-lg font-semibold text-white">{title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{detail}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function FallbackAndReleaseSections() {
    return (
        <>
            <section className="px-4 py-20 sm:px-6">
                <div className="mx-auto max-w-6xl">
                    <SectionHeader
                        eyebrow="Fallback"
                        title="When the answer is missing, users still get a path."
                        description="AnswerLattice should be honest about missing coverage. Fallback creates a support path and a support improvement signal."
                    />
                    <AnswerlatticeSequenceDiagram
                        idPrefix="al-product-ticket-fallback"
                        items={[
                            { title: 'User asks', detail: 'A question arrives from Billing, Onboarding, Settings, or another product page.' },
                            { title: 'Coverage missing', detail: 'No approved answer or owner answer safely covers the question.' },
                            { title: 'Ticket fallback', detail: 'The user can contact support with safe page context attached.' },
                            { title: 'Support gap', detail: 'The missing answer becomes visible review work.' },
                            { title: 'Future answer improves', detail: 'Owner review can turn the gap into an approved answer.' },
                        ]}
                        splitAfter={2}
                    />
                </div>
            </section>

            <section className="px-4 py-20 sm:px-6">
                <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Release support</p>
                        <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
                            Your support should change when your product changes.
                        </h2>
                        <p className="mt-5 text-base leading-relaxed text-[#a0a0c0]">
                            Fast-moving SaaS products break support knowledge quietly. Releases can affect onboarding flows, billing rules, FAQ answers, and widget guidance.
                        </p>
                    </div>
                    <div className="rounded-[2rem] border border-white/[0.08] bg-[#101028] p-5">
                        <div className="rounded-2xl border border-teal-300/20 bg-teal-400/[0.08] p-5">
                            <div className="text-xs font-semibold uppercase tracking-widest text-teal-200">Release note</div>
                            <h3 className="mt-2 text-xl font-bold text-white">New onboarding flow released</h3>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {[
                                ['Affected surfaces', 'Onboarding page, setup article, FAQ, widget prompt'],
                                ['Review created', '2 stale answers, 1 article update, 1 new answer candidate'],
                                ['Owner action', 'Approve, edit, or reject support changes'],
                                ['User result', 'Future onboarding questions use updated guidance'],
                            ].map(([title, detail]) => (
                                <article key={title} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                                    <h3 className="text-sm font-semibold text-white">{title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[#8f8faa]">{detail}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

function ReviewAndGovernanceSections() {
    return (
        <>
            <section className="px-4 py-20 sm:px-6">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="Review rhythm"
                        title="Know what to fix in support every week."
                        description="Coverage, fallback, stale answers, and draft improvements should be visible without forcing founders to inspect every ticket manually."
                    />
                    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                        <div className="rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3">
                            <AnswerlatticeAssetImage
                                asset={ANSWERLATTICE_PRODUCT_PREVIEW_ASSETS['Answer review']}
                                className="rounded-[1.5rem] border border-white/[0.08]"
                            />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                            {[
                                ['12', 'Repeated questions'],
                                ['4', 'Stale answers'],
                                ['8', 'Fallback tickets'],
                                ['73%', 'Approved-answer coverage'],
                                ['5', 'Draft improvements'],
                            ].map(([value, label]) => (
                                <article key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                                    <div className="text-3xl font-bold text-white">{value}</div>
                                    <div className="mt-1 text-sm font-semibold text-[#a0a0c0]">{label}</div>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-20 sm:px-6">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="Trust mechanism"
                        title="Built around support truth, not AI confidence."
                        description="The deeper product layer keeps page context, approved answers, stale-answer review, and repeated-gap review connected."
                    />
                    <div className="rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-4 shadow-2xl shadow-black/30 sm:p-6">
                        <AnswerlatticeCrossDiagram idPrefix="al-product-governance" items={TRUST_ITEMS} />
                    </div>
                </div>
            </section>
        </>
    );
}

function DifferenceAndSignupSections({ basePath }: { basePath: string }) {
    return (
        <>
            <section className="px-4 py-20 sm:px-6">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="Difference"
                        title="Built as a support layer, not another support widget."
                        description="The product should feel broad enough to support a launch, but narrow enough to avoid helpdesk expectations."
                    />
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        {DIFFERENCE_CARDS.map(([title, detail]) => (
                            <article key={title} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-5">
                                <h3 className="text-base font-semibold text-white">{title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{detail}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 py-20 sm:px-6">
                <div className="mx-auto max-w-6xl">
                    <SectionHeader
                        eyebrow="After signup"
                        title="From signup to first supported users."
                        description="Self-serve setup should move a founder from workspace creation to widget install and first review work."
                    />
                    <div className="grid gap-3 md:grid-cols-7">
                        {SIGNUP_STEPS.map((step, index) => (
                            <article key={step} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-center">
                                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl border border-teal-200/15 bg-teal-300/[0.08] text-xs font-bold text-teal-200">
                                    {index + 1}
                                </span>
                                <h3 className="mt-4 text-sm font-semibold leading-snug text-white">{step}</h3>
                            </article>
                        ))}
                    </div>
                    <div className="mt-8 flex justify-center">
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/get-started"
                            className="al-page-hero__button al-page-hero__button--primary"
                        >
                            Start support setup
                        </AnswerlatticeLink>
                    </div>
                </div>
            </section>
        </>
    );
}

function FinalCta({ basePath }: { basePath: string }) {
    return (
        <section className="px-4 py-20 text-center sm:px-6">
            <div className="mx-auto max-w-5xl rounded-[2rem] border border-teal-300/15 bg-teal-400/[0.045] p-8 sm:p-12">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-200">Ready when users arrive</p>
                <h2 className="mx-auto max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl">
                    Give your SaaS a support system before support becomes your job.
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#d6d6ef]">
                    Set up an in-app widget, hosted help, approved answers, ticket fallback, changelog, feedback, and support review loop in one connected layer.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/get-started"
                        data-answerlattice-event="product_final_cta_clicked"
                        data-answerlattice-label="start_setup"
                        className="al-page-hero__button al-page-hero__button--primary"
                    >
                        Start support setup
                    </AnswerlatticeLink>
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/demo"
                        data-answerlattice-event="product_final_cta_clicked"
                        data-answerlattice-label="view_demo"
                        className="al-page-hero__button al-page-hero__button--secondary"
                    >
                        View demo
                    </AnswerlatticeLink>
                </div>
            </div>
        </section>
    );
}

export default function AnswerlatticeProductPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/product" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <PageHero
                    eyebrow="Product overview"
                    title="Everything your SaaS needs to support users before you hire a support team."
                    description="AnswerLattice connects your in-app support widget, hosted help center, FAQs, tickets, changelog, feedback, approved answers, and review queue into one support layer."
                    basePath={basePath}
                    align="left"
                    actions={[
                        {
                            label: 'Start support setup',
                            href: '/get-started',
                            variant: 'primary',
                            event: 'product_hero_cta_clicked',
                            eventLabel: 'start_support_setup',
                        },
                        {
                            label: 'View demo',
                            href: '/demo',
                            variant: 'secondary',
                            event: 'product_hero_cta_clicked',
                            eventLabel: 'demo',
                        },
                    ]}
                    proofItems={[
                        { label: 'What it is', value: '24/7 support layer for founder-led SaaS' },
                        { label: 'What it connects', value: 'Widget, hosted help, tickets, feedback, releases, and review' },
                        { label: 'What stays safe', value: 'Safe context, owner approval, and scoped workspace access' },
                    ]}
                >
                    <ProductSystemVisual />
                </PageHero>

                <SupportLayerMap />
                <OperatingModesSection />
                <FeatureDirectorySection basePath={basePath} />
                {FEATURE_SECTIONS.map((section) => (
                    <FeatureSplitSection key={section.title} section={section} />
                ))}
                <ApprovedAnswersSection />
                <FallbackAndReleaseSections />
                <ReviewAndGovernanceSections />
                <DifferenceAndSignupSections basePath={basePath} />
                <FinalCta basePath={basePath} />
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
