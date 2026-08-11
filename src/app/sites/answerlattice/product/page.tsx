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
import AnswerlatticeConceptIllustration from '../components/AnswerlatticeConceptIllustration';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import ComparisonSection from '../components/ComparisonSection';
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
    description: 'AnswerLattice turns scattered product knowledge into a standard support knowledge structure for your widget, help center, FAQs, fallback, and review loop.',
    alternates: { canonical: '/product' },
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

const SUPPORT_LAYER_INPUTS = [
    {
        title: 'What you add',
        detail: 'Scattered docs, tickets, release notes, support replies, product notes, screenshots, recordings, and founder memory.',
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
        title: 'What becomes reusable',
        detail: 'Hosted help, FAQs, changelog support, product-page guidance, and approved answers come from the same reviewed support knowledge.',
        meta: 'Reusable support',
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
        items: ['Workspace activation', 'Product details', 'Starter knowledge', 'Product pages', 'Widget install'],
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
        items: ['Approved answers', 'Knowledge Map', 'Friction evidence', 'Answer Tests', 'Release impact'],
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
        title: 'Publish a help center without separating support knowledge.',
        description: 'Give users a support home for docs, FAQs, owner answers, changelog, and common product questions. The help center and widget should work from the same reviewed knowledge.',
        image: 'Help center and tickets',
        icon: LuBookOpen,
        bullets: ['Scannable docs and article navigation', 'FAQ and owner answers', 'Release notes', 'Custom help domains', 'Ticket fallback'],
        reverse: true,
    },
];

const PRODUCT_PAGE_ASSET_SLOT_IDS: Record<keyof typeof ANSWERLATTICE_PRODUCT_AREA_ASSETS, string> = {
    'Set up support': 'product.area.launch-setup',
    'In-app help widget': 'product.area.page-aware-widget',
    'Help center and tickets': 'product.area.support-control',
    'Review approved answers': 'product.area.knowledge-governance',
};

const TRUST_ITEMS = [
    {
        title: 'Knowledge Map',
        detail: 'Review product relationships, answer coverage, drift, and support concepts without exposing a raw internal graph.',
        meta: 'Context',
    },
    {
        title: 'Approved answers first',
        detail: 'Reviewed answers are served before fallback so users get the same official guidance.',
        meta: 'Official answers',
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

const FOUNDER_CONTROL_CARDS = [
    {
        eyebrow: 'Every day',
        title: 'Start with a daily support brief',
        description: 'See up to four focused current decisions, or a clear quiet state when the available evidence needs no action. The brief reads support summaries, stays read-only, and routes you to the right review screen.',
        href: '/product/support-control',
        cta: 'See daily support control',
    },
    {
        eyebrow: 'Support coverage',
        title: 'Inspect the Knowledge Map',
        href: '/product/knowledge-governance',
        description: 'Review product relationships, approved-answer coverage, stale guidance, and review state from the existing bounded graph summary. It is a focused decision view, not a raw graph or diagram editor.',
        cta: 'Explore answer review',
    },
    {
        eyebrow: 'Customer pressure',
        title: 'Prioritize friction with evidence',
        description: 'Compare mapped product areas across completed seven-day windows, then open the exact area in Knowledge Map. Weighted support load helps prioritize review; it is not a root-cause or product-health score.',
        href: '/product/knowledge-governance',
        cta: 'See friction review',
    },
    {
        eyebrow: 'Before release',
        title: 'Review release impact',
        description: 'See directly linked approved answers and current linked Answer Tests before activating a versioned release. Owner confirmation remains required, and stale impact previews are rejected.',
        href: '/product/changelog',
        cta: 'See release review',
    },
    {
        eyebrow: 'Answer assurance',
        title: 'Run saved Answer Tests',
        description: 'Check priority questions, expected sources, required or forbidden claims, evidence, fallback, escalation, and no-answer behavior. These deterministic checks are regression evidence, not an independent correctness guarantee, and never change a release. A rollback request creates a draft for owner review. It never overwrites the live answer or applies a rollback automatically. Provider-backed fallback cannot certify critical proof.',
        href: '/product/knowledge-governance',
        cta: 'Review answer controls',
    },
    {
        eyebrow: 'During an issue',
        title: 'Show a Known Issue notice',
        description: 'Publish an approved, contextual notice with an expiry and optional HTTPS status link while permanent support answers remain unchanged.',
        href: '/product/proactive-help',
        cta: 'See contextual help',
    },
    {
        eyebrow: 'Trusted context',
        title: 'Use verified visitor context',
        description: 'Optionally sign short-lived visitor context on your server. Invalid tokens lose signed-only identity claims while normal page-aware support continues. When owners attach up to three support-safe HTTPS evidence links, AnswerLattice stores them with private widget-search activity and never fetches or embeds them.',
        href: '/developers/verified-visitor-context',
        cta: 'Read the developer boundary',
    },
    {
        eyebrow: 'Data portability',
        title: 'Export reviewed support knowledge',
        description: 'Authorized owners can use Support Truth Export to download a complete bounded JSON package of approved knowledge and product structure. Tickets, conversations, secrets, and raw audit logs stay out.',
        href: '/security',
        cta: 'Review data boundaries',
    },
];

const DIFFERENCE_CARDS = [
    ['Not a generic chatbot', 'Answers require owner review before they become official support.'],
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
        <AnswerlatticeConceptIllustration variant="source-to-answer" showHeader={false} />
    );
}

function SupportLayerMap() {
    return (
        <section className="px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="System map"
                    title="One support layer across your product, help content, tickets, and review work."
                    description="This is where AnswerLattice stops feeling like one widget. Scattered product knowledge becomes approved answers, hosted help, fallback paths, and review work."
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
        <section className="al-linear-proof border-t border-white/[0.06] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Operating spine"
                    title="Support has three jobs: prepare, serve, and improve."
                    description="AnswerLattice turns scattered setup material, tickets, docs, feedback, and reviewed answers into one support workflow instead of leaving them across separate tools."
                />
                <div className="al-linear-proof__grid">
                    <article className="al-linear-proof__copy" data-answerlattice-reveal>
                        <p className="al-linear-proof__kicker">01 / Founder-led support</p>
                        <h3>One workflow from first setup to weekly review.</h3>
                        <p>
                            A founder should know what to prepare, what users can use today, and what needs review next.
                            That is the product story behind the support layer.
                        </p>
                        <div className="al-linear-proof__chips">
                            {SIGNUP_STEPS.slice(0, 5).map((step) => (
                                <span key={step}>{step}</span>
                            ))}
                        </div>
                    </article>

                    <div className="al-linear-proof__visual" data-answerlattice-reveal>
                        <div className="al-linear-proof__mode-stack">
                            {OPERATING_MODES.map((mode, index) => {
                                const Icon = mode.icon;
                                return (
                                    <article key={mode.title} className="al-linear-proof__mode">
                                        <span className="al-linear-proof__card-index">{String(index + 1).padStart(2, '0')}</span>
                                        <span className="al-linear-proof__icon">
                                            <Icon aria-hidden size={19} />
                                        </span>
                                        <div>
                                            <h3>{mode.title}</h3>
                                            <p>{mode.description}</p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="al-linear-proof__cards al-linear-proof__cards--three">
                    {OPERATING_MODES.map((mode, index) => {
                        const Icon = mode.icon;
                        return (
                            <article key={mode.title} className="al-linear-proof__card" data-answerlattice-reveal-item>
                                <div className="al-linear-proof__card-header">
                                    <span className="al-linear-proof__card-index">{String(index + 1).padStart(2, '0')}</span>
                                    <span className="al-linear-proof__icon">
                                        <Icon aria-hidden size={19} />
                                    </span>
                                </div>
                                <h3>{mode.title}</h3>
                                <p>{mode.description}</p>
                                <ul className="al-linear-proof__list">
                                    {mode.items.map((item) => (
                                        <li key={item}>{item}</li>
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
                assetSlotId={PRODUCT_PAGE_ASSET_SLOT_IDS[section.image]}
                assetRole="product-page-feature-split"
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
                    eyebrow="Approved answers"
                    title="Official answers should be approved, not guessed."
                    description="AI can help draft, but owner review decides what becomes official support."
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
                    <AnswerlatticeConceptIllustration variant="governance-loop" />
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
                                assetSlotId="product.area.knowledge-governance"
                                assetRole="product-page-review-rhythm"
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
                        title="Built around reviewed support, not AI confidence."
                        description="Page context, approved answers, stale-answer review, and repeated gaps work together so official support stays reviewable."
                    />
                    <div className="rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-4 shadow-2xl shadow-black/30 sm:p-6">
                        <AnswerlatticeCrossDiagram idPrefix="al-product-governance" items={TRUST_ITEMS} />
                    </div>
                </div>
            </section>
        </>
    );
}

function FounderControlSection({ basePath }: { basePath: string }) {
    return (
        <section className="border-y border-white/[0.06] bg-white/[0.012] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Founder review"
                    title="Move from today&apos;s priority to a reviewed support decision."
                    description="Daily Brief, Knowledge Map, Product Friction Evidence, release impact, and Answer Tests use the same product and support context. Each view keeps the owner in control and routes to the next exact review step."
                />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {FOUNDER_CONTROL_CARDS.map((item) => (
                        <article key={item.title} className="flex min-h-[18rem] flex-col border-t border-white/[0.1] px-1 py-6" data-answerlattice-reveal-item>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-300">{item.eyebrow}</p>
                            <h3 className="mt-4 text-xl font-semibold leading-snug text-white">{item.title}</h3>
                            <p className="mt-3 flex-1 text-sm leading-relaxed text-[#a0a0c0]">{item.description}</p>
                            <AnswerlatticeLink
                                basePath={basePath}
                                href={item.href}
                                className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-teal-200 transition hover:text-white"
                            >
                                {item.cta}
                            </AnswerlatticeLink>
                        </article>
                    ))}
                </div>
            </div>
        </section>
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
                        description="Self-serve setup should move a founder from source intake to approved answers, widget install, hosted help, and first review work."
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
                            Create workspace
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
                    Turn scattered product knowledge into an in-app widget, hosted help, approved answers, ticket fallback, changelog support, feedback, and review loop.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/get-started"
                        data-answerlattice-event="product_final_cta_clicked"
                        data-answerlattice-label="create_workspace"
                        className="al-page-hero__button al-page-hero__button--primary"
                    >
                        Create workspace
                    </AnswerlatticeLink>
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/demo"
                        data-answerlattice-event="product_final_cta_clicked"
                        data-answerlattice-label="see_60_sec_demo"
                        className="al-page-hero__button al-page-hero__button--secondary"
                    >
                        See 60-sec demo
                    </AnswerlatticeLink>
                </div>
            </div>
        </section>
    );
}

export default async function AnswerlatticeProductPage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/product" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <PageHero
                    eyebrow="Product overview"
                    title="Turn scattered product knowledge into the support system users expect."
                    description="AnswerLattice shapes docs, tickets, releases, screenshots, recordings, notes, and repeated replies into reviewed support for your in-app widget, hosted help center, FAQs, changelog, fallback tickets, and future AI agents."
                    basePath={basePath}
                    align="left"
                    actions={[
                        {
                            label: 'Create workspace',
                            href: '/get-started',
                            variant: 'primary',
                            event: 'product_hero_cta_clicked',
                            eventLabel: 'create_workspace',
                        },
                        {
                            label: 'See 60-sec demo',
                            href: '/demo',
                            variant: 'secondary',
                            event: 'product_hero_cta_clicked',
                            eventLabel: 'see_60_sec_demo',
                        },
                    ]}
                    proofItems={[
                        { label: 'What it is', value: 'Reviewed support layer for founder-led SaaS' },
                        { label: 'What it turns into', value: 'Widget help, hosted help, FAQs, fallback, feedback, releases, and review' },
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
                <FounderControlSection basePath={basePath} />
                <ReviewAndGovernanceSections />
                <DifferenceAndSignupSections basePath={basePath} />
                <ComparisonSection />
                <FinalCta basePath={basePath} />
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
