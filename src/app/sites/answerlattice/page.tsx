import { Metadata } from 'next';
import { headers } from 'next/headers';
import type { CSSProperties } from 'react';
import {
    LuArrowRight,
    LuBell,
    LuBookOpen,
    LuCheckCircle,
    LuFileText,
    LuHelpCircle,
    LuLayoutDashboard,
    LuMessageSquare,
    LuShieldCheck,
    LuTicket,
} from 'react-icons/lu';
import AnswerlatticeAssetImage from './components/AnswerlatticeAssetImage';
import AnswerlatticeFooter from './components/Footer';
import AnswerlatticeHeader from './components/Header';
import AnswerlatticeLink from './components/AnswerlatticeLink';
import AnswerlatticeStructuredData from './components/StructuredData';
import CTASection from './components/CTASection';
import ObjectionsSection from './components/ObjectionsSection';
import PageProofStrip from './components/PageProofStrip';
import PricingPreviewSection from './components/PricingPreviewSection';
import SectionHeader from './components/SectionHeader';
import SupportSurfaceStoryNav from './components/SupportSurfaceStoryNav';
import { AnswerlatticeDiagramCore, AnswerlatticeLoopDiagram } from './components/AnswerlatticeFlowDiagram';
import {
    ANSWERLATTICE_FEATURE_ASSETS,
    ANSWERLATTICE_DEMO_SURFACE_ASSETS,
    ANSWERLATTICE_HOME_HERO_ASSET,
    ANSWERLATTICE_PRODUCT_AREA_ASSETS,
    ANSWERLATTICE_PRODUCT_PREVIEW_ASSETS,
} from './answerlatticeWebsiteAssets';
import { ANSWERLATTICE_SITE_DESCRIPTION, ANSWERLATTICE_SITE_TITLE } from './siteConfig';

export const metadata: Metadata = {
    title: ANSWERLATTICE_SITE_TITLE,
    description: ANSWERLATTICE_SITE_DESCRIPTION,
    alternates: { canonical: '/' },
};

function getBasePath(): string {
    try {
        const headersList = headers();
        const productId = headersList.get('x-product-id');
        const host = headersList.get('host') || '';
        const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
        return (productId && isLocalhost) ? '/__answerlattice' : '';
    } catch {
        return '';
    }
}

const HERO_CHIPS = [
    'In-app widget',
    'Hosted help center',
    'FAQ',
    'Changelog',
    'Ticket fallback',
    'Feedback review',
    'Approved answers',
];

const HERO_TITLE_LINES = [
    ['Support', 'your', 'product', 'users'],
    ['without', 'hiring', 'a', 'support', 'team.'],
];

const CAPABILITY_PROOF = [
    { label: 'In-app help', value: 'Users get support where they are stuck.' },
    { label: 'Hosted help', value: 'Docs, FAQs, and changelog live in one support layer.' },
    { label: 'Fallback path', value: 'Missing answers create tickets and support gaps.' },
    { label: 'Founder review', value: 'You approve what becomes official support.' },
];

const FOUNDER_PRESSURE = [
    'Users get stuck during onboarding',
    'Billing and plan questions repeat',
    'Setup and integration questions land in your inbox',
    'Release changes make old docs stale',
    'Support lives in DMs, tickets, and founder memory',
];

const BUSINESS_SOLUTION_CARDS = [
    {
        title: 'Users get help inside your product',
        description: 'The widget brings support to billing, onboarding, settings, integrations, releases, and error screens.',
        icon: LuMessageSquare,
    },
    {
        title: 'Missing answers become visible',
        description: 'Fallback tickets, repeated questions, and low-rated replies become support gaps instead of hidden founder work.',
        icon: LuTicket,
    },
    {
        title: 'Help content stays connected',
        description: 'Hosted help, FAQ, changelog, feedback, and support-board work share the same reviewed support layer.',
        icon: LuBookOpen,
    },
    {
        title: 'You approve official support',
        description: 'AI can draft and organize, but customer-facing guidance stays reviewed before it becomes official.',
        icon: LuShieldCheck,
    },
];

const OWNER_INPUT_DIAGRAM_INPUTS = [
    {
        title: 'Owner inputs',
        detail: 'Product docs, repeated replies, screenshots, recordings, and release notes.',
    },
];

const OWNER_INPUT_DIAGRAM_OUTPUTS = [
    {
        title: 'In-app widget',
        detail: 'Generated page-aware help can appear inside billing, onboarding, settings, releases, and error screens.',
    },
    {
        title: 'Help center',
        detail: 'Reviewed support material becomes a hosted place where users can self-serve.',
    },
    {
        title: 'FAQ answers',
        detail: 'Repeated short questions become reusable answers you can review before users see them.',
    },
    {
        title: 'Documentation',
        detail: 'Product notes, screenshots, recordings, and release details become clearer support docs.',
    },
];

const SUPPORT_SURFACE_STORY = [
    {
        id: 'support-surface-owner-inputs',
        navLabel: 'Owner inputs',
        eyebrow: '01 / Owner inputs',
        title: 'Start from the support knowledge you already have.',
        description: 'Product docs, repeated replies, screenshots, recordings, release notes, and support notes become the source layer for customer-facing help.',
        bullets: ['Docs', 'Repeated replies', 'Screenshots', 'Release notes'],
        href: '/product/knowledge-intake',
        icon: LuBookOpen,
        asset: ANSWERLATTICE_FEATURE_ASSETS['knowledge-intake'],
    },
    {
        id: 'support-surface-in-app-help',
        navLabel: 'In-app help',
        eyebrow: '02 / In-app help',
        title: 'Give users help on the screen where they get stuck.',
        description: 'The widget brings support into billing, onboarding, settings, integrations, releases, and error screens without forcing users to leave the product.',
        bullets: ['Safe page context', 'Widget help', 'Fallback path'],
        href: '/product/page-aware-widget',
        icon: LuMessageSquare,
        asset: ANSWERLATTICE_PRODUCT_AREA_ASSETS['In-app help widget'],
    },
    {
        id: 'support-surface-hosted-help',
        navLabel: 'Hosted help',
        eyebrow: '03 / Hosted help',
        title: 'Publish a support home outside the product too.',
        description: 'Hosted help, documentation, FAQ answers, and changelog content stay connected to the same reviewed support layer.',
        bullets: ['Help center', 'Documentation', 'FAQ', 'Changelog'],
        href: '/product/support-control',
        icon: LuFileText,
        asset: ANSWERLATTICE_PRODUCT_AREA_ASSETS['Help center and tickets'],
    },
    {
        id: 'support-surface-gaps-fallback',
        navLabel: 'Gaps and fallback',
        eyebrow: '04 / Gaps and fallback',
        title: 'When help is missing, users still get a path.',
        description: 'Tickets, low-rated answers, repeated questions, and feedback become visible support gaps instead of hidden founder work.',
        bullets: ['Ticket fallback', 'Feedback review', 'Support gaps'],
        href: '/product/tickets',
        icon: LuTicket,
        asset: ANSWERLATTICE_FEATURE_ASSETS.tickets,
    },
    {
        id: 'support-surface-review-loop',
        navLabel: 'Review loop',
        eyebrow: '05 / Review loop',
        title: 'You decide what becomes official support.',
        description: 'Drafts and missing answers stay reviewable until you approve them, so the next user gets better support without you repeating the same reply.',
        bullets: ['Approved answers', 'Review queue', 'Support Board'],
        href: '/product/knowledge-governance',
        icon: LuShieldCheck,
        asset: ANSWERLATTICE_PRODUCT_AREA_ASSETS['Review approved answers'],
    },
];

const PRODUCT_OVERVIEW_HERO_FEATURES = [
    {
        label: 'In-app support widget',
        href: '/product/page-aware-widget',
        eyebrow: '01 / In-app help',
        title: 'Help users on the screen where they get stuck.',
        description:
            'Add an in-app widget, pass safe page hints, show approved answers or owner FAQ answers first, and open ticket fallback only when coverage is missing.',
        bullets: ['Safe page context', 'Approved answers first', 'Screenshot attachment', 'Ticket fallback'],
        asset: ANSWERLATTICE_PRODUCT_AREA_ASSETS['In-app help widget'],
    },
    {
        label: 'Hosted help center',
        href: '/product/support-control',
        eyebrow: '02 / Hosted help',
        title: 'Give users a support home outside the app too.',
        description:
            'Publish docs, FAQs, owner answers, and changelog content on hosted help while keeping tickets, feedback, and workspace internals private.',
        bullets: ['Docs and articles', 'FAQ and owner answers', 'Changelog', 'Custom help domains'],
        asset: ANSWERLATTICE_PRODUCT_AREA_ASSETS['Help center and tickets'],
    },
];

const PRODUCT_OVERVIEW_FEATURES = [
    {
        label: 'Ticket fallback',
        href: '/product/tickets',
        description: 'When AnswerLattice cannot answer from reviewed knowledge, the user still gets a path and you get the support gap.',
        icon: LuTicket,
        asset: ANSWERLATTICE_FEATURE_ASSETS.tickets,
    },
    {
        label: 'FAQ management',
        href: '/product/faq-management',
        description: 'Turn repeated short questions into owner-reviewed answers that support the widget and hosted help center.',
        icon: LuHelpCircle,
        asset: ANSWERLATTICE_FEATURE_ASSETS['faq-management'],
    },
    {
        label: 'Changelog',
        href: '/product/changelog',
        description: 'Connect release notes to product surfaces and answers so changed features do not leave stale support behind.',
        icon: LuFileText,
        asset: ANSWERLATTICE_FEATURE_ASSETS.changelog,
    },
    {
        label: 'Feedback review',
        href: '/product/feedback-review',
        description: 'Collect ratings, suggestions, and product-area feedback privately, then decide what becomes support work.',
        icon: LuBell,
        asset: ANSWERLATTICE_FEATURE_ASSETS['feedback-review'],
    },
    {
        label: 'Support Board',
        href: '/product/support-board',
        description: 'Track manual support cards, private owner notes, tickets, and feedback that need follow-up.',
        icon: LuLayoutDashboard,
        asset: ANSWERLATTICE_FEATURE_ASSETS['support-board'],
    },
    {
        label: 'Approved answers',
        href: '/product/knowledge-governance',
        description: 'Keep official answers reviewed, page-aware, and connected to the surfaces where users ask for help.',
        icon: LuCheckCircle,
        asset: ANSWERLATTICE_PRODUCT_AREA_ASSETS['Review approved answers'],
    },
    {
        label: 'Knowledge intake',
        href: '/product/knowledge-intake',
        description: 'Start from docs, product links, FAQs, release notes, files, screenshots, recordings, and repeated replies.',
        icon: LuBookOpen,
        asset: ANSWERLATTICE_FEATURE_ASSETS['knowledge-intake'],
    },
    {
        label: 'Workflow notifications',
        href: '/product/workflow-notifications',
        description: 'Send support review prompts and workflow updates when gaps, stale answers, or feedback need attention.',
        icon: LuBell,
        asset: ANSWERLATTICE_FEATURE_ASSETS['workflow-notifications'],
    },
];

const PRODUCT_OVERVIEW_FEATURE_CARD_CLASSES = [
    'al-product-overview__feature-card--wide',
    '',
    '',
    '',
    '',
    'al-product-overview__feature-card--wide',
    'al-product-overview__feature-card--wide',
    'al-product-overview__feature-card--wide',
];

const SETUP_STEPS = [
    {
        title: 'Add your product',
        detail: 'Create the workspace and add the product pages where users need help.',
        meta: 'Product',
    },
    {
        title: 'Import support knowledge',
        detail: 'Start with docs, FAQs, release notes, tickets, owner notes, screenshots, or repeated replies.',
        meta: 'Sources',
    },
    {
        title: 'Map important pages',
        detail: 'Connect billing, onboarding, settings, integrations, releases, and error screens to support topics.',
        meta: 'Context',
    },
    {
        title: 'Review approved answers',
        detail: 'Keep official help reviewed instead of letting every draft become customer-facing support.',
        meta: 'Review',
    },
    {
        title: 'Install the widget',
        detail: 'Add one script, set allowed domains, block sensitive routes, and verify the support path.',
        meta: 'Widget',
    },
    {
        title: 'Improve from gaps',
        detail: 'Tickets, low ratings, repeated misses, and stale pages become review work.',
        meta: 'Loop',
    },
];

const SUPPORT_LOOP = [
    {
        title: 'User asks in your product',
        detail: 'Billing, onboarding, settings, releases, integrations, and errors can each carry safe context.',
        meta: 'User',
    },
    {
        title: 'Known help is served',
        detail: 'Approved answers, FAQ, hosted help, and changelog content are checked before fallback.',
        meta: 'Support',
    },
    {
        title: 'Missing help opens fallback',
        detail: 'The user can create a ticket instead of hitting a dead end.',
        meta: 'Fallback',
    },
    {
        title: 'The gap becomes visible',
        detail: 'Repeated tickets, low ratings, and missing answers show what support needs next.',
        meta: 'Gap',
    },
    {
        title: 'You approve the improvement',
        detail: 'The next user gets better official support without you repeating the same reply.',
        meta: 'Review',
    },
    {
        title: 'Every surface stays current',
        detail: 'The widget, hosted help, FAQ, changelog, and fallback path use the same reviewed support truth.',
        meta: 'Surfaces',
    },
];

const TRUST_CARDS = [
    {
        title: 'AI can draft. You decide what is official.',
        description: 'AnswerLattice is built around approved support knowledge. Drafts, proposals, and repeated gaps stay reviewable until you approve them.',
        icon: LuShieldCheck,
    },
    {
        title: 'When the answer is missing, users still get a path.',
        description: 'Fallback tickets prevent dead ends. The missing answer becomes a support gap you can fix for the next user.',
        icon: LuTicket,
    },
    {
        title: 'Your support surfaces share the same truth.',
        description: 'Widget, help center, FAQ, changelog, tickets, and feedback all point back to the same reviewed support layer.',
        icon: LuLayoutDashboard,
    },
];

const REVIEW_SIGNALS = [
    'Missing answers',
    'Repeated questions',
    'Stale answers after releases',
    'Low-rated responses',
    'Support-heavy product areas',
    'Tickets that should become reusable help',
];

const BUILT_FOR = [
    'Vibe coders with real users',
    'Solo SaaS founders',
    'Technical founders near launch',
    'Small SaaS teams before a support hire',
    'Studios launching multiple SaaS products',
    'AI-built products moving faster than docs',
];

function getHeroWordStyle(index: number): CSSProperties {
    return {
        '--al-hero-word-delay': `${80 + index * 82}ms`,
    } as CSSProperties;
}

function HomepageHero({ basePath }: { basePath: string }) {
    return (
        <section className="relative overflow-hidden px-4 pb-14 pt-24 sm:px-6 lg:pt-32">
            <div className="mx-auto max-w-7xl">
                <div className="mx-auto max-w-6xl text-center">
                    <p className="al-home-hero__eyebrow mb-4 text-xs font-semibold uppercase tracking-widest text-teal-300">
                        The first 24/7 support layer for founder-led SaaS
                    </p>
                    <h1 className="al-home-hero-title mx-auto max-w-6xl text-4xl font-extrabold leading-[1.14] tracking-normal text-white sm:text-5xl lg:text-6xl xl:text-[4.2rem]">
                        {HERO_TITLE_LINES.map((line, lineIndex) => (
                            <span
                                key={line.join('-')}
                                className={`al-home-hero-title__line ${lineIndex === 1 ? 'al-home-hero-title__line--gradient' : ''}`}
                            >
                                {lineIndex === 1 ? (
                                    <span
                                        className="al-home-hero-title__gradient-copy"
                                        style={getHeroWordStyle(HERO_TITLE_LINES[0].length)}
                                    >
                                        {line.join(' ')}
                                    </span>
                                ) : (
                                    line.map((word, wordIndex) => (
                                        <span
                                            key={`${lineIndex}-${word}`}
                                            className="al-home-hero-title__word"
                                            style={getHeroWordStyle(wordIndex)}
                                        >
                                            {word}
                                        </span>
                                    ))
                                )}
                            </span>
                        ))}
                    </h1>
                    <p className="al-home-hero__subtitle mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[#a0a0c0] sm:text-xl">
                        AnswerLattice turns your docs, FAQs, release notes, product pages, tickets, feedback, and repeated replies you already send into one trusted support layer with approved answers, ticket fallback, and a review loop that keeps support current.
                    </p>
                    <div className="al-home-hero__actions mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/get-started"
                            data-answerlattice-event="hero_cta_clicked"
                            data-answerlattice-label="start_support_setup"
                            className="al-page-hero__button al-page-hero__button--primary"
                        >
                            Start support setup
                        </AnswerlatticeLink>
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/demo"
                            data-answerlattice-event="hero_cta_clicked"
                            data-answerlattice-label="see_how_it_works"
                            className="al-page-hero__button al-page-hero__button--secondary"
                        >
                            See how it works
                        </AnswerlatticeLink>
                    </div>
                </div>

                <div className="al-home-hero__chips mx-auto mt-7 flex max-w-4xl flex-wrap justify-center gap-2">
                    {HERO_CHIPS.map((chip) => (
                        <span key={chip} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[#a0a0c0]">
                            {chip}
                        </span>
                    ))}
                </div>

                <div className="al-home-hero__image mx-auto mt-12 max-w-6xl rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3">
                    <AnswerlatticeAssetImage
                        asset={ANSWERLATTICE_HOME_HERO_ASSET}
                        priority
                        className="rounded-[1.5rem] border border-white/[0.08]"
                    />
                </div>

                <div className="al-home-hero__proof">
                    <PageProofStrip className="mx-auto mt-8 max-w-6xl text-left" items={CAPABILITY_PROOF} />
                </div>
            </div>
        </section>
    );
}

function FounderPressureSection() {
    return (
        <section className="px-4 py-20 sm:px-6">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div data-answerlattice-reveal>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Founder anxiety</p>
                    <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
                        You built the product. Now every user question feels personal.
                    </h2>
                    <p className="mt-5 text-base leading-relaxed text-[#a0a0c0] sm:text-lg">
                        AI helped you ship faster. Once real users arrive, support becomes the next bottleneck. AnswerLattice is built for the moment when your SaaS becomes real, but your support team does not exist yet.
                    </p>
                </div>
                <div className="grid gap-3">
                    {FOUNDER_PRESSURE.map((item, index) => (
                        <article key={item} className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-200/15 bg-teal-300/[0.08] text-xs font-bold text-teal-200">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <p className="text-sm font-semibold leading-relaxed text-[#d6d6ef] sm:text-base">{item}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

function OwnerInputDiagram() {
    const input = OWNER_INPUT_DIAGRAM_INPUTS[0];

    return (
        <div className="al-business-solution__diagram al-owner-flow">
            <svg
                className="al-owner-flow__paths al-owner-flow__paths--desktop"
                viewBox="0 0 600 620"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
            >
                <path className="al-owner-flow__path" d="M300 126 C300 148 300 178 300 239" pathLength={1} />
                <path className="al-owner-flow__path" d="M300 239 C260 285 210 330 173 360" pathLength={1} />
                <path className="al-owner-flow__path" d="M300 239 C340 285 390 330 428 360" pathLength={1} />
                <path className="al-owner-flow__path" d="M300 239 C245 345 190 420 173 484" pathLength={1} />
                <path className="al-owner-flow__path" d="M300 239 C355 345 410 420 428 484" pathLength={1} />
                <path className="al-owner-flow__pulse" d="M300 126 C300 148 300 178 300 239" pathLength={1} />
                <path
                    className="al-owner-flow__pulse al-owner-flow__pulse--output"
                    d="M300 239 C260 285 210 330 173 360"
                    pathLength={1}
                    style={{ '--al-owner-flow-delay': '2.55s' } as CSSProperties}
                />
                <path
                    className="al-owner-flow__pulse al-owner-flow__pulse--output"
                    d="M300 239 C340 285 390 330 428 360"
                    pathLength={1}
                    style={{ '--al-owner-flow-delay': '2.85s' } as CSSProperties}
                />
                <path
                    className="al-owner-flow__pulse al-owner-flow__pulse--output"
                    d="M300 239 C245 345 190 420 173 484"
                    pathLength={1}
                    style={{ '--al-owner-flow-delay': '3.15s' } as CSSProperties}
                />
                <path
                    className="al-owner-flow__pulse al-owner-flow__pulse--output"
                    d="M300 239 C355 345 410 420 428 484"
                    pathLength={1}
                    style={{ '--al-owner-flow-delay': '3.45s' } as CSSProperties}
                />
            </svg>
            <svg
                className="al-owner-flow__paths al-owner-flow__paths--mobile"
                viewBox="0 0 360 760"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
            >
                <path className="al-owner-flow__path" d="M180 112 C180 126 180 150 180 209" pathLength={1} />
                <path className="al-owner-flow__path" d="M180 209 C174 266 178 296 180 314" pathLength={1} />
                <path className="al-owner-flow__path" d="M180 209 C200 326 160 396 180 434" pathLength={1} />
                <path className="al-owner-flow__path" d="M180 209 C160 396 202 498 180 537" pathLength={1} />
                <path className="al-owner-flow__path" d="M180 209 C204 486 160 616 180 657" pathLength={1} />
                <path className="al-owner-flow__pulse" d="M180 112 C180 126 180 150 180 209" pathLength={1} />
                <path
                    className="al-owner-flow__pulse al-owner-flow__pulse--output"
                    d="M180 209 C174 266 178 296 180 314"
                    pathLength={1}
                    style={{ '--al-owner-flow-delay': '2.55s' } as CSSProperties}
                />
                <path
                    className="al-owner-flow__pulse al-owner-flow__pulse--output"
                    d="M180 209 C200 326 160 396 180 434"
                    pathLength={1}
                    style={{ '--al-owner-flow-delay': '2.85s' } as CSSProperties}
                />
                <path
                    className="al-owner-flow__pulse al-owner-flow__pulse--output"
                    d="M180 209 C160 396 202 498 180 537"
                    pathLength={1}
                    style={{ '--al-owner-flow-delay': '3.15s' } as CSSProperties}
                />
                <path
                    className="al-owner-flow__pulse al-owner-flow__pulse--output"
                    d="M180 209 C204 486 160 616 180 657"
                    pathLength={1}
                    style={{ '--al-owner-flow-delay': '3.45s' } as CSSProperties}
                />
            </svg>

            <div className="al-owner-flow__input-row">
                <article className="al-owner-flow__card al-owner-flow__card--input">
                    <h3>{input.title}</h3>
                    <p>{input.detail}</p>
                </article>
            </div>

            <div className="al-owner-flow__core">
                <AnswerlatticeDiagramCore idPrefix="answerlattice-owner-input-flow-core" />
            </div>

            <div className="al-owner-flow__output-row">
                <div className="al-owner-flow__outputs">
                    {OWNER_INPUT_DIAGRAM_OUTPUTS.map((output) => (
                        <article key={output.title} className="al-owner-flow__card al-owner-flow__card--output">
                            <h3>{output.title}</h3>
                            <p>{output.detail}</p>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
}

function BusinessSolutionSection({ basePath }: { basePath: string }) {
    return (
        <section className="al-reference-section al-business-solution px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Business & support solution"
                    title="Your first support system after launch."
                    description="Give AnswerLattice your product docs, repeated replies, screenshots, recordings, and release notes. It turns those owner inputs into support outputs users can actually use: in-app help, hosted help, FAQs, documentation, and reviewed answers."
                />

                <div className="al-business-solution__panel" data-answerlattice-reveal>
                    <div className="al-business-solution__copy">
                        <p className="al-business-solution__kicker">Before your first support hire</p>
                        <h3>Launch support without turning support into your full-time job.</h3>
                        <p>
                            Your users need answers, paths, updates, and feedback loops. You need to keep building the product. AnswerLattice sits between scattered founder replies and a full helpdesk operation.
                        </p>
                        <div className="al-business-solution__boundaries">
                            {['Not a generic chatbot', 'Not static docs', 'Not a helpdesk replacement'].map((item) => (
                                <span key={item}>{item}</span>
                            ))}
                        </div>
                        <AnswerlatticeLink basePath={basePath} href="/product" className="al-business-solution__link">
                            See product overview
                            <LuArrowRight aria-hidden size={16} />
                        </AnswerlatticeLink>
                    </div>

                    <OwnerInputDiagram />
                </div>

                <div className="al-business-solution__grid">
                    {BUSINESS_SOLUTION_CARDS.map((card) => {
                        const Icon = card.icon;
                        return (
                            <article key={card.title} className="al-business-solution__card" data-answerlattice-reveal-item>
                                <span>
                                    <Icon aria-hidden size={20} />
                                </span>
                                <h3>{card.title}</h3>
                                <p>{card.description}</p>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function SupportSurfaceStorySection() {
    const surfaceNavItems = SUPPORT_SURFACE_STORY.map((surface) => ({
        id: surface.id,
        label: surface.navLabel,
    }));

    return (
        <section id="support-surfaces" className="al-reference-section al-surface-story px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="From inputs to support surfaces"
                    title="One support layer across every place users ask for help."
                    description="AnswerLattice turns what you already know into the support sequence users need: owner inputs, in-app help, hosted help, gaps and fallback, and a review loop that keeps support current."
                />

                <div className="al-surface-story__layout">
                    <div className="al-surface-story__copy" data-answerlattice-reveal>
                        <SupportSurfaceStoryNav items={surfaceNavItems} />
                    </div>

                    <div className="al-surface-story__screens">
                        {SUPPORT_SURFACE_STORY.map((surface, index) => {
                            const Icon = surface.icon;
                            return (
                                <article
                                    key={surface.title}
                                    id={surface.id}
                                    className="al-surface-story__screen"
                                    data-answerlattice-reveal-item
                                    style={{ '--al-surface-story-top': `${6.75 + index * 0.72}rem` } as CSSProperties}
                                >
                                    <div className="al-surface-story__screen-copy">
                                        <p>{surface.eyebrow}</p>
                                        <span>
                                            <Icon aria-hidden size={18} />
                                        </span>
                                        <h3>{surface.title}</h3>
                                        <p>{surface.description}</p>
                                        <div>
                                            {surface.bullets.map((bullet) => (
                                                <em key={bullet}>{bullet}</em>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="al-surface-story__media">
                                        <AnswerlatticeAssetImage
                                            asset={surface.asset}
                                            reveal={false}
                                            className="al-surface-story__asset"
                                            imageClassName="al-surface-story__asset-img"
                                        />
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

function ProductOverviewSection({ basePath }: { basePath: string }) {
    return (
        <section className="al-reference-section al-product-overview px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Product overview"
                    title="Everything your first support layer needs."
                    description="Manage the support surfaces founders usually scatter across docs, inboxes, release notes, forms, and chat widgets."
                />

                <div className="al-product-overview__showcase">
                    {PRODUCT_OVERVIEW_HERO_FEATURES.map((feature, index) => (
                        <article
                            key={feature.label}
                            className={`al-product-overview__hero-card ${index % 2 === 1 ? 'al-product-overview__hero-card--reverse' : ''}`}
                            data-answerlattice-reveal-item
                        >
                            <div className="al-product-overview__hero-copy">
                                <p>{feature.eyebrow}</p>
                                <h3>{feature.title}</h3>
                                <span>{feature.description}</span>
                                <div>
                                    {feature.bullets.map((bullet) => (
                                        <em key={bullet}>{bullet}</em>
                                    ))}
                                </div>
                                <AnswerlatticeLink basePath={basePath} href={feature.href} className="al-product-overview__feature-link">
                                    Explore {feature.label}
                                    <LuArrowRight aria-hidden size={16} />
                                </AnswerlatticeLink>
                            </div>
                            <div className="al-product-overview__hero-media">
                                <AnswerlatticeAssetImage
                                    asset={feature.asset}
                                    className="al-product-overview__asset"
                                    imageClassName="al-product-overview__asset-img"
                                />
                            </div>
                        </article>
                    ))}
                </div>

                <div className="al-product-overview__feature-grid">
                    {PRODUCT_OVERVIEW_FEATURES.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <AnswerlatticeLink
                                key={feature.label}
                                basePath={basePath}
                                href={feature.href}
                                className={`al-product-overview__feature-card ${PRODUCT_OVERVIEW_FEATURE_CARD_CLASSES[index] || ''}`}
                                data-answerlattice-reveal-item
                            >
                                <span className="al-product-overview__number">{String(index + 3).padStart(2, '0')}</span>
                                <AnswerlatticeAssetImage
                                    asset={feature.asset}
                                    className="al-product-overview__mini-asset"
                                    imageClassName="al-product-overview__mini-img"
                                />
                                <span className="al-product-overview__icon">
                                    <Icon aria-hidden size={18} />
                                </span>
                                <h3>{feature.label}</h3>
                                <p>{feature.description}</p>
                                <span className="al-product-overview__card-link">
                                    View feature
                                    <LuArrowRight aria-hidden size={15} />
                                </span>
                            </AnswerlatticeLink>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function SetupPathSection() {
    return (
        <section className="px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="How it works"
                    title="Start with what you already have."
                    description="You do not need a perfect docs site. Start with the support material, product pages, tickets, and repeated replies already around your product."
                />

                <div className="al-setup-track" data-answerlattice-reveal>
                    <div className="al-setup-track__intro">
                        <p>One setup session</p>
                        <h3>Connect the support pieces before users arrive.</h3>
                        <span>
                            Start from existing material, map it to product pages, review what becomes official, then install the widget.
                        </span>
                    </div>

                    <ol className="al-setup-track__steps" aria-label="AnswerLattice setup path">
                        {SETUP_STEPS.map((step, index) => (
                            <li key={step.title} className="al-setup-track__step" data-answerlattice-reveal-item>
                                <div className="al-setup-track__step-head">
                                    <span>{String(index + 1).padStart(2, '0')}</span>
                                    {step.meta ? <em>{step.meta}</em> : null}
                                </div>
                                <h3>{step.title}</h3>
                                <p>{step.detail}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
}

function InAppSupportSection() {
    return (
        <section className="px-4 py-20 sm:px-6">
            <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
                <div data-answerlattice-reveal>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">In-app support</p>
                    <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
                        Help users where they get stuck, not after they leave.
                    </h2>
                    <p className="mt-5 text-base leading-relaxed text-[#a0a0c0]">
                        A user on your billing page should get billing help. A user on onboarding should get onboarding help. A user on settings should get settings help.
                    </p>
                    <p className="mt-4 text-base leading-relaxed text-[#a0a0c0]">
                        AnswerLattice uses safe product context to make support more relevant without turning your app into a black box.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                        {['Billing', 'Onboarding', 'Settings', 'Integrations', 'Releases', 'Errors'].map((item) => (
                            <span key={item} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[#a0a0c0]">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3">
                    <AnswerlatticeAssetImage
                        asset={ANSWERLATTICE_DEMO_SURFACE_ASSETS.billing}
                        className="rounded-[1.5rem] border border-white/[0.08]"
                    />
                </div>
            </div>
        </section>
    );
}

function TrustAndFallbackSection() {
    return (
        <section className="border-y border-white/[0.06] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Trust and fallback"
                    title="AI can draft. You decide what becomes official."
                    description="Approved answers are a highlighted feature, but they serve the bigger promise: users get trusted support and missing coverage becomes visible."
                />
                <div className="grid gap-4 lg:grid-cols-3">
                    {TRUST_CARDS.map((card) => {
                        const Icon = card.icon;
                        return (
                            <article key={card.title} className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] p-6">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-200/15 bg-teal-300/[0.08] text-teal-200">
                                    <Icon aria-hidden size={21} />
                                </span>
                                <h3 className="mt-6 text-xl font-semibold text-white">{card.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{card.description}</p>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function ConnectedLoopSection() {
    return (
        <section className="px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Connected support surfaces"
                    title="Your widget, help center, tickets, changelog, and feedback should share the same support truth."
                    description="Publish help content, answer FAQs, collect tickets, announce changes, and review feedback from one connected support layer."
                />
                <div className="rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-4 shadow-2xl shadow-black/30 sm:p-6" data-answerlattice-reveal>
                    <AnswerlatticeLoopDiagram idPrefix="al-home-support-loop" items={SUPPORT_LOOP} />
                </div>
            </div>
        </section>
    );
}

function FounderReviewSection() {
    return (
        <section className="px-4 py-20 sm:px-6">
            <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.18fr_0.82fr] lg:items-center">
                <div className="order-2 rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3 lg:order-1">
                    <AnswerlatticeAssetImage
                        asset={ANSWERLATTICE_PRODUCT_PREVIEW_ASSETS['Feedback review']}
                        className="rounded-[1.5rem] border border-white/[0.08]"
                    />
                </div>
                <div className="order-1 lg:order-2" data-answerlattice-reveal>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Founder review loop</p>
                    <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
                        Know what to fix in support every week.
                    </h2>
                    <p className="mt-5 text-base leading-relaxed text-[#a0a0c0]">
                        AnswerLattice shows missing answers, repeated questions, stale answers, low-rated responses, and support-heavy product areas so support improves without guesswork.
                    </p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {REVIEW_SIGNALS.map((item) => (
                            <div key={item} className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-sm text-[#d6d6ef]">
                                <span className="mt-0.5 text-teal-300">✓</span>
                                {item}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function AiBuiltSaasSection() {
    return (
        <section className="border-y border-white/[0.06] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-6xl">
                <SectionHeader
                    eyebrow="AI-built SaaS"
                    title="AI helped you build faster. AnswerLattice helps you support what you shipped."
                    description="Built for vibe coders, solo founders, technical founders, and small SaaS teams launching faster than traditional support processes can keep up."
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {BUILT_FOR.map((item) => (
                        <article key={item} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 text-sm font-semibold text-[#d6d6ef]">
                            {item}
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

function PositioningBoundarySection() {
    return (
        <section className="px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-6xl">
                <SectionHeader
                    eyebrow="Not a chatbot"
                    title="It sits between answering everything yourself and hiring a full support department."
                    description="AnswerLattice is not another chatbot, not a full helpdesk, and not static docs. It is the first support layer for founder-led SaaS."
                />
                <div className="grid gap-4 md:grid-cols-3">
                    {[
                        ['Not another chatbot', 'Official help requires approved support knowledge instead of loose generated replies.'],
                        ['Not a full helpdesk', 'Tickets stay fallback and signal source, not the center of the product.'],
                        ['Not static docs', 'Feedback, tickets, releases, and low-rated answers show what needs review.'],
                    ].map(([title, description]) => (
                        <article key={title} className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-6">
                            <h3 className="text-lg font-semibold text-white">{title}</h3>
                            <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{description}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default function AnswerlatticeHomePage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <AnswerlatticeStructuredData />
            <main className="al-home-flow">
                <HomepageHero basePath={basePath} />
                <FounderPressureSection />
                <BusinessSolutionSection basePath={basePath} />
                <SupportSurfaceStorySection />
                <ProductOverviewSection basePath={basePath} />
                <ConnectedLoopSection />
                <SetupPathSection />
                <InAppSupportSection />
                <TrustAndFallbackSection />
                <FounderReviewSection />
                <AiBuiltSaasSection />
                <PositioningBoundarySection />
                <PricingPreviewSection basePath={basePath} />
                <ObjectionsSection />
                <CTASection basePath={basePath} />
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
