import { Metadata } from 'next';
import { headers } from 'next/headers';
import { Fragment, type CSSProperties } from 'react';
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
import AnswerlatticeMotionAsset from './components/AnswerlatticeMotionAsset';
import {
    ANSWERLATTICE_AUTHORITY_TRANSFER_MOTION,
    ANSWERLATTICE_FEATURE_ASSETS,
    ANSWERLATTICE_DEMO_SURFACE_ASSETS,
    ANSWERLATTICE_HOME_SUPPORT_CONTROL_MOTION,
    ANSWERLATTICE_PRODUCT_AREA_ASSETS,
    ANSWERLATTICE_PRODUCT_PREVIEW_ASSETS,
} from './answerlatticeWebsiteAssets';
import { ANSWERLATTICE_SITE_DESCRIPTION, ANSWERLATTICE_SITE_TITLE } from './siteConfig';

export const metadata: Metadata = {
    title: ANSWERLATTICE_SITE_TITLE,
    description: ANSWERLATTICE_SITE_DESCRIPTION,
    alternates: { canonical: '/' },
};

async function getBasePath(): Promise<string> {
    try {
        const headersList = (await headers());
        const aliasBasePath = headersList.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

        const productId = headersList.get('x-product-id');
        const host = headersList.get('host') || '';
        const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
        return (productId && isLocalhost) ? '/__answerlattice' : '';
    } catch {
        return '';
    }
}

const HERO_CHIPS = [
    'Approved answers first',
    'Pre-release answer checks',
    'Fallback when missing',
    'Owner review loop',
    'In-app widget',
    'Hosted help center',
    'FAQ and changelog',
    'Safe page context',
];

const HERO_TITLE_LINES = [
    ['Support', 'your', 'product', 'users'],
    ['without', 'hiring', 'a', 'support', 'team.'],
];

const HERO_TITLE_TEXT = HERO_TITLE_LINES.map((line) => line.join(' ')).join(' ');

const CAPABILITY_PROOF = [
    { label: 'Answer order', value: 'Approved answers come before fallback.' },
    { label: 'Missing coverage', value: 'Fallback creates tickets and support gaps.' },
    { label: 'Founder review', value: 'You approve what becomes official support.' },
    { label: 'User questions', value: 'Billing, onboarding, settings, releases, and errors stay covered.' },
];

const SUITE_BUILD_STEPS = [
    {
        title: 'Bring scattered knowledge',
        detail: 'Start from docs, tickets, releases, screenshots, recordings, notes, repeated replies, and founder memory.',
        meta: 'Sources',
    },
    {
        title: 'Map where users need help',
        detail: 'Tie support topics to billing, onboarding, settings, releases, and errors.',
        meta: 'Context',
    },
    {
        title: 'Create the support structure',
        detail: 'Turn scattered material into widget help, hosted help, FAQ, changelog support, approved answers, and fallback.',
        meta: 'Surfaces',
    },
    {
        title: 'Review what support missed',
        detail: 'Tickets, ratings, stale guidance, and gaps become owner review work.',
        meta: 'Loop',
    },
];

const SUPPORT_LAYER_PHASES = [
    {
        label: 'Collect',
        title: 'Bring the scattered product knowledge',
        detail: 'Docs, tickets, releases, screenshots, recordings, notes, support replies, and founder memory.',
    },
    {
        label: 'Shape',
        title: 'Turn it into reviewed support structure',
        detail: 'Articles, FAQs, approved answers, page context, changelog updates, and support gaps.',
    },
    {
        label: 'Serve',
        title: 'Use it across every support surface',
        detail: 'In-app widget, hosted help center, fallback tickets, feedback review, and future AI-agent context.',
    },
];

const SUPPORT_SWITCH_OPTIONS = [
    {
        title: 'Generic chatbots',
        common: 'Generated replies can drift from approved product truth.',
        answerlattice: 'Approved answers are checked first, with fallback only when coverage is missing.',
        icon: LuMessageSquare,
    },
    {
        title: 'Helpdesks',
        common: 'Ticket queues help teams respond, but tickets become the center.',
        answerlattice: 'Tickets stay a fallback path and signal source for missing support coverage.',
        icon: LuTicket,
    },
    {
        title: 'Static knowledge bases',
        common: 'Articles help, but product pages and releases keep changing.',
        answerlattice: 'Widget help, hosted help, FAQ, and changelog come from reviewed support knowledge.',
        icon: LuBookOpen,
    },
    {
        title: 'Scattered docs and replies',
        common: 'Support memory lives across docs, DMs, tickets, screenshots, and release notes.',
        answerlattice: 'Those sources become a reviewable support layer before users need the answer.',
        icon: LuFileText,
    },
];

const SUITE_CAPABILITIES = [
    {
        title: 'Answer inside the product',
        description: 'Approved answers and fallback from the page where users get stuck.',
        href: '/product/page-aware-widget',
        icon: LuMessageSquare,
        items: ['Widget', 'Safe context', 'Fallback'],
    },
    {
        title: 'Publish a support home',
        description: 'Docs, FAQs, owner answers, and changelog in one hosted help layer.',
        href: '/product/support-control',
        icon: LuBookOpen,
        items: ['Help center', 'FAQ', 'Changelog'],
    },
    {
        title: 'Keep tickets as fallback',
        description: 'When approved support is missing, users still get a path.',
        href: '/product/tickets',
        icon: LuTicket,
        items: ['Tickets', 'Support gaps', 'Safe context'],
    },
    {
        title: 'Approve the official answer',
        description: 'Drafts, feedback, repeated misses, and pre-release answer checks stay reviewable before publishing.',
        href: '/product/knowledge-governance',
        icon: LuShieldCheck,
        items: ['Approved answers', 'Answer tests', 'Owner control'],
    },
];

const INSTALL_SURFACES = [
    { label: 'Next.js', href: '/install/frameworks/nextjs', detail: 'App Router and Pages Router guidance.' },
    { label: 'React SPA', href: '/install/frameworks/react', detail: 'Client-side route context updates.' },
    { label: 'Vue / Nuxt', href: '/install/frameworks/vue', detail: 'Framework install and context handoff.' },
    { label: 'Plain HTML', href: '/install/frameworks/plain-html', detail: 'Script-tag setup for static products.' },
    { label: 'Shopify-style', href: '/install/frameworks/shopify', detail: 'Theme-level widget placement.' },
    { label: 'Webflow-style', href: '/install/frameworks/webflow', detail: 'Hosted-site custom-code install.' },
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
        title: 'Scattered knowledge becomes usable support',
        description: 'Docs, notes, tickets, releases, feedback, and founder replies become standard help users can actually use.',
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
        title: 'Scattered product knowledge',
        detail: 'Docs, tickets, releases, screenshots, recordings, notes, support replies, and founder memory.',
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
        navSummary: 'Scattered docs, notes, screenshots, recordings, and releases become structured support.',
        eyebrow: 'Owner inputs',
        title: 'Start from the knowledge already scattered around your product.',
        description: 'Product docs, repeated replies, screenshots, recordings, release notes, support notes, and founder memory become structured help content and answer drafts.',
        bullets: ['Docs', 'Replies', 'Screenshots', 'Release notes'],
        href: '/product/knowledge-intake',
        icon: LuBookOpen,
        asset: ANSWERLATTICE_FEATURE_ASSETS['knowledge-intake'],
    },
    {
        id: 'support-surface-in-app-help',
        navLabel: 'In-app help',
        navSummary: 'Support appears on billing, onboarding, settings, and error screens.',
        eyebrow: 'In-app help',
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
        navSummary: 'Docs, FAQ, and changelog come from the same structured support knowledge.',
        eyebrow: 'Hosted help',
        title: 'Publish a support home outside the product too.',
        description: 'Hosted help, documentation, FAQ answers, and changelog content come from the same structured support knowledge instead of separate scattered notes.',
        bullets: ['Help center', 'Documentation', 'FAQ', 'Changelog'],
        href: '/product/support-control',
        icon: LuFileText,
        asset: ANSWERLATTICE_PRODUCT_AREA_ASSETS['Help center and tickets'],
    },
    {
        id: 'support-surface-gaps-fallback',
        navLabel: 'Gaps and fallback',
        navSummary: 'Missing answers become tickets, feedback, and visible support gaps.',
        eyebrow: 'Gaps and fallback',
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
        navSummary: 'Drafts stay reviewable until you approve customer-facing guidance.',
        eyebrow: 'Review loop',
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
        eyebrow: 'In-app help',
        title: 'Help users on the screen where they get stuck.',
        description:
            'Add an in-app widget, pass safe page hints, show approved answers or owner FAQ answers first, and open ticket fallback only when coverage is missing.',
        bullets: ['Safe page context', 'Approved answers first', 'Screenshot attachment', 'Ticket fallback'],
        asset: ANSWERLATTICE_PRODUCT_AREA_ASSETS['In-app help widget'],
    },
    {
        label: 'Hosted help center',
        href: '/product/support-control',
        eyebrow: 'Hosted help',
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
        description: 'Turn release notes into support review triggers so changed features do not leave stale answers behind.',
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
        description: 'Keep official answers reviewed, page-aware, and ready for the surfaces where users ask for help.',
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
    'al-product-overview__feature-card--priority',
    'al-product-overview__feature-card--compact',
    'al-product-overview__feature-card--compact',
    'al-product-overview__feature-card--compact',
    'al-product-overview__feature-card--compact',
    'al-product-overview__feature-card--priority',
    'al-product-overview__feature-card--priority',
    'al-product-overview__feature-card--medium',
];

const SETUP_STEPS = [
    {
        title: 'Add your product',
        detail: 'Create the workspace and add the product pages where users need help.',
        meta: 'Product',
    },
    {
        title: 'Import support knowledge',
        detail: 'Start with scattered docs, FAQs, release notes, tickets, owner notes, screenshots, recordings, or repeated replies.',
        meta: 'Sources',
    },
    {
        title: 'Map important pages',
        detail: 'Map billing, onboarding, settings, integrations, releases, and error screens to the support topics users need there.',
        meta: 'Context',
    },
    {
        title: 'Review approved answers',
        detail: 'Keep official help reviewed instead of letting every draft become customer-facing support.',
        meta: 'Review',
    },
    {
        title: 'Install the widget',
        detail: 'Add one script, set exact allowed origins, hide the launcher on selected routes, and verify the support path.',
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

const POSITIONING_BOUNDARIES = [
    {
        title: 'Not another chatbot',
        description: 'Official help requires approved support knowledge instead of loose generated replies.',
    },
    {
        title: 'Not a full helpdesk',
        description: 'Tickets stay fallback and signal source, not the center of the product.',
    },
    {
        title: 'Not static docs',
        description: 'Feedback, tickets, releases, and low-rated answers show what needs review.',
    },
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
                        Approved answers before fallback
                    </p>
                    <h1
                        className="al-home-hero-title mx-auto max-w-6xl text-4xl font-extrabold leading-[1.14] tracking-normal text-white sm:text-5xl lg:text-6xl xl:text-[4.2rem]"
                        aria-label={HERO_TITLE_TEXT}
                    >
                        {HERO_TITLE_LINES.map((line, lineIndex) => (
                            <Fragment key={line.join('-')}>
                                <span
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
                                            <Fragment key={`${lineIndex}-${word}`}>
                                                <span
                                                    className="al-home-hero-title__word"
                                                    style={getHeroWordStyle(wordIndex)}
                                                >
                                                    {word}
                                                </span>
                                                {wordIndex < line.length - 1 ? ' ' : null}
                                            </Fragment>
                                        ))
                                    )}
                                </span>
                                {lineIndex < HERO_TITLE_LINES.length - 1 ? ' ' : null}
                            </Fragment>
                        ))}
                    </h1>
                    <p className="al-home-hero__subtitle mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[#a0a0c0] sm:text-xl">
                        AnswerLattice turns scattered docs, tickets, releases, product context, screenshots, recordings, notes, and repeated replies into approved answers for your help widget, help center, and future AI agents.
                    </p>
                    <div className="al-home-hero__actions mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/get-started"
                            data-answerlattice-event="hero_cta_clicked"
                            data-answerlattice-label="create_workspace"
                            className="al-page-hero__button al-page-hero__button--primary"
                        >
                            Create workspace
                        </AnswerlatticeLink>
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/demo"
                            data-answerlattice-event="hero_cta_clicked"
                            data-answerlattice-label="see_60_sec_demo"
                            className="al-page-hero__button al-page-hero__button--secondary"
                        >
                            See 60-sec demo
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

                <div className="al-home-hero__image mx-auto mt-12 max-w-6xl" data-answerlattice-visual-slot="home.hero.product-loop">
                    <AnswerlatticeMotionAsset
                        asset={ANSWERLATTICE_HOME_SUPPORT_CONTROL_MOTION}
                        assetSlotId="answerlattice.home.hero.support-control-motion"
                        assetRole="home-hero-support-control-motion"
                        priority
                        className="rounded-[2rem] border border-white/[0.08] shadow-2xl shadow-black/30"
                    />
                </div>

                <div className="al-home-hero__proof">
                    <PageProofStrip className="mx-auto mt-8 max-w-6xl text-left" items={CAPABILITY_PROOF} />
                </div>
            </div>
        </section>
    );
}

function FirstTrustedAnswersSection({ basePath }: { basePath: string }) {
    const steps = [
        ['01', 'Teach from product sources', 'Select the website, docs, notes, releases, screenshots, or repeated replies you are willing to use as support evidence.'],
        ['02', 'Generate a product-specific ten', 'Prepare ten editable questions and draft answers with source links, applicability, risk, and missing-evidence warnings.'],
        ['03', 'Run free checks first', 'Canonical-only Answer Tests verify expected behavior without calling an AI provider.'],
        ['04', 'Measure real outcomes', 'Track explicit Solved and Still need help responses instead of treating no escalation as proof.'],
    ] as const;

    return (
        <section className="border-y border-white/[0.06] bg-teal-400/[0.025] px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-teal-200">First trusted answers</p>
                        <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
                            Start with the ten questions most likely to interrupt your launch.
                        </h2>
                        <p className="mt-4 max-w-xl text-base leading-relaxed text-[#a0a0c0]">
                            You do not need a complete support operation on day one. Start from your own product sources, review the generated first-ten drafts, approve the answer path, verify the widget, then improve from real gaps.
                        </p>
                        <AnswerlatticeLink basePath={basePath} href="/resources/founder-launch-kit" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800">
                            Open founder launch kit
                            <LuArrowRight aria-hidden size={15} />
                        </AnswerlatticeLink>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {steps.map(([number, title, detail]) => (
                            <article key={number} className="border-t border-white/[0.09] py-4">
                                <span className="text-xs font-semibold text-teal-200">{number}</span>
                                <h3 className="mt-2 text-base font-semibold text-white">{title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#8f8faa]">{detail}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function SupportSuiteSection({ basePath }: { basePath: string }) {
    return (
        <section className="border-y border-white/[0.06] bg-white/[0.012] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="One support layer"
                    title="Turn scattered product knowledge into every support surface users expect."
                    description="AnswerLattice starts from the material founders already have, shapes it into reviewed support knowledge, then serves it through the widget, help center, FAQs, tickets, changelog, feedback, and future AI-agent context."
                />

                <div className="al-support-layer-flow" data-answerlattice-reveal>
                    {SUPPORT_LAYER_PHASES.map((phase, index) => (
                        <article
                            key={phase.label}
                            className="al-support-layer-flow__step"
                            data-answerlattice-reveal-item
                            style={{ '--al-support-layer-index': index } as CSSProperties}
                        >
                            <span>{String(index + 1).padStart(2, '0')}</span>
                            <p>{phase.label}</p>
                            <h3>{phase.title}</h3>
                            <em>{phase.detail}</em>
                        </article>
                    ))}
                </div>

                <div className="al-support-switch" data-answerlattice-reveal>
                    <div className="al-support-switch__intro">
                        <p>Compare by answer source</p>
                        <h3>If you are comparing tools, start with where the official answer comes from.</h3>
                        <span>AnswerLattice is not trying to be the loudest reply box. It keeps approved product support ahead of fallback.</span>
                    </div>
                    <div className="al-support-switch__grid" aria-label="AnswerLattice category comparison">
                        {SUPPORT_SWITCH_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            return (
                                <article key={option.title} className="al-support-switch__item" data-answerlattice-reveal-item>
                                    <span className="al-support-switch__icon">
                                        <Icon aria-hidden size={18} />
                                    </span>
                                    <div>
                                        <h3>{option.title}</h3>
                                        <p><strong>Common path:</strong> {option.common}</p>
                                        <p><strong>AnswerLattice:</strong> {option.answerlattice}</p>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                    <AnswerlatticeLink basePath={basePath} href="/comparisons" className="al-support-switch__link">
                        Open category comparisons
                        <LuArrowRight aria-hidden size={15} />
                    </AnswerlatticeLink>
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-4">
                    {SUITE_CAPABILITIES.map((capability) => {
                        const Icon = capability.icon;
                        return (
                            <AnswerlatticeLink
                                key={capability.title}
                                basePath={basePath}
                                href={capability.href}
                                className="al-suite-card group rounded-[1.75rem] border border-white/[0.08] bg-[#09091a] p-5 transition hover:border-teal-300/25 hover:bg-teal-400/[0.045]"
                                data-answerlattice-reveal-item
                            >
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-200/15 bg-teal-300/[0.08] text-teal-200">
                                    <Icon aria-hidden size={20} />
                                </span>
                                <h3 className="mt-5 text-lg font-semibold leading-snug text-white">{capability.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{capability.description}</p>
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {capability.items.map((item) => (
                                        <span key={item} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-[#a0a0c0]">
                                            {item}
                                        </span>
                                    ))}
                                </div>
                                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-200 transition group-hover:text-white">
                                    Explore
                                    <LuArrowRight aria-hidden size={15} />
                                </span>
                            </AnswerlatticeLink>
                        );
                    })}
                </div>

                <div className="al-suite-stack" data-answerlattice-reveal>
                    <div className="al-suite-stack__intro">
                        <p>Support layer build path</p>
                        <h3>One setup flow turns messy inputs into support users can use.</h3>
                        <span>Each step adds structure: sources, page context, support surfaces, and the review loop.</span>
                    </div>
                    <div className="al-suite-stack__cards" aria-label="How AnswerLattice turns scattered product knowledge into support surfaces">
                        {SUITE_BUILD_STEPS.map((step, index) => (
                            <article
                                key={step.title}
                                className="al-suite-stack__card"
                                data-answerlattice-reveal-item
                            >
                                <div className="al-suite-stack__card-head">
                                    <span>{String(index + 1).padStart(2, '0')}</span>
                                    <em>{step.meta}</em>
                                </div>
                                <h3>{step.title}</h3>
                                <p>{step.detail}</p>
                            </article>
                        ))}
                    </div>
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

function InstallSurfaceSection({ basePath }: { basePath: string }) {
    return (
        <section className="border-y border-white/[0.06] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
                    <div data-answerlattice-reveal>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Install path</p>
                        <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
                            Install without an enterprise project.
                        </h2>
                        <p className="mt-5 text-base leading-relaxed text-[#a0a0c0]">
                            Install confidence should be obvious: one widget contract, framework-specific setup paths, safe context rules, and verification before launch.
                        </p>
                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                            <AnswerlatticeLink basePath={basePath} href="/install" className="rounded-xl bg-teal-700 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800">
                                Open install guide
                            </AnswerlatticeLink>
                            <AnswerlatticeLink basePath={basePath} href="/quickstarts" className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 py-3 text-center text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white">
                                View quickstarts
                            </AnswerlatticeLink>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {INSTALL_SURFACES.map((surface) => (
                            <AnswerlatticeLink
                                key={surface.href}
                                basePath={basePath}
                                href={surface.href}
                                className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-teal-300/25 hover:bg-teal-500/[0.045]"
                                data-answerlattice-reveal-item
                            >
                                <h3 className="text-base font-semibold text-white">{surface.label}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#8f8faa]">{surface.detail}</p>
                            </AnswerlatticeLink>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function BusinessSolutionSection({ basePath }: { basePath: string }) {
    return (
        <section className="al-reference-section al-business-solution px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Business & support solution"
                    title="Your first support system after launch."
                    description="Every founder already has product knowledge somewhere: docs, tickets, release notes, screenshots, recordings, owner notes, product context, and repeated replies. AnswerLattice turns that scattered material into standard support knowledge users can actually use: in-app help, hosted help, FAQs, documentation, and reviewed answers."
                />

                <div className="al-business-solution__panel" data-answerlattice-reveal>
                    <div className="al-business-solution__copy">
                        <p className="al-business-solution__kicker">Before your first support hire</p>
                        <h3>Launch support without turning support into your full-time job.</h3>
                        <p>
                            Your users need answers, paths, updates, and feedback loops. Your support knowledge is probably spread across founder memory, old replies, notes, docs, tickets, and release updates. AnswerLattice turns that reality into a support layer before it becomes your full-time job.
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
        summary: surface.navSummary,
    }));

    return (
        <section
            id="support-surfaces"
            className="al-reference-section al-surface-story px-4 py-20 sm:px-6"
            data-answerlattice-visual-slot="home.support-surfaces.sticky-story"
        >
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="From inputs to support surfaces"
                    title="One support layer across every place users ask for help."
                    description="Start with scattered product knowledge. Turn it into structured in-product help, hosted pages, approved answers, and review work when coverage is missing."
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
                                            assetSlotId="home.support-surfaces.sticky-story"
                                            assetRole={surface.id}
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
        <section
            className="al-reference-section al-product-overview px-4 py-20 sm:px-6"
            data-answerlattice-visual-slot="home.product-overview.feature-cards"
        >
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Product overview"
                    title="Everything your first support layer needs."
                    description="Bring the support knowledge founders usually scatter across docs, inboxes, release notes, screenshots, forms, and chat widgets into one standard structure."
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
                                    assetSlotId="home.product-overview.feature-cards"
                                    assetRole={feature.label}
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
                                    assetSlotId="home.product-overview.feature-cards"
                                    assetRole={feature.label}
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
                    description="You do not need a perfect docs site. Start with the scattered product knowledge already around your product: docs, tickets, releases, screenshots, recordings, owner notes, pages, and repeated replies."
                />

                <div className="al-setup-track" data-answerlattice-reveal>
                    <div className="al-setup-track__intro">
                        <p>One setup session</p>
                        <h3>Turn scattered product knowledge into support before users arrive.</h3>
                        <span>
                            Bring scattered material into a standard structure, map it to product pages, review what becomes official, then publish it through the widget and help center.
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
                        assetSlotId="demo.page-aware-widget"
                        assetRole="legacy-home-in-app-support"
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
        <section
            className="px-4 py-20 sm:px-6"
            data-answerlattice-visual-slot="home.support-loop.diagram"
        >
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Shared support truth"
                    title="Keep every support surface aligned."
                    description="When an answer is missing, fallback becomes review work. When the fix is approved, the next user gets better support."
                />
                <div className="mx-auto mb-8 max-w-5xl rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/25 sm:p-3" data-answerlattice-reveal>
                    <AnswerlatticeMotionAsset
                        asset={ANSWERLATTICE_AUTHORITY_TRANSFER_MOTION}
                        assetSlotId="answerlattice.home.section.authority-transfer"
                        assetRole="home-authority-transfer-motion"
                        className="rounded-[1.5rem] border border-white/[0.08]"
                    />
                </div>
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
                        assetSlotId="home.product-overview.feature-cards"
                        assetRole="legacy-home-founder-review"
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
                                <LuCheckCircle className="mt-0.5 shrink-0 text-teal-300" size={16} aria-hidden />
                                {item}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function FounderFitBoundarySection() {
    return (
        <section className="al-founder-fit border-y border-white/[0.06] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Founder fit"
                    title="Built for founders at the support tipping point."
                    description="For AI-built products, solo founders, technical founders, small SaaS teams, and studios that need a first support layer before support becomes a full-time job."
                />
                <div className="al-founder-fit__grid">
                    <article className="al-founder-fit__panel al-founder-fit__panel--primary" data-answerlattice-reveal-item>
                        <p>Best fit</p>
                        <h3>When the product is real, but the support team is not.</h3>
                        <div className="al-founder-fit__list">
                            {BUILT_FOR.map((item) => (
                                <span key={item}>{item}</span>
                            ))}
                        </div>
                    </article>
                    <div className="al-founder-fit__boundaries">
                        {POSITIONING_BOUNDARIES.map((item) => (
                            <article key={item.title} className="al-founder-fit__boundary-card" data-answerlattice-reveal-item>
                                <h3>{item.title}</h3>
                                <p>{item.description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default async function AnswerlatticeHomePage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticeHeader basePath={basePath} />
            <AnswerlatticeStructuredData />
            <main className="al-home-flow">
                <HomepageHero basePath={basePath} />
                <FirstTrustedAnswersSection basePath={basePath} />
                <SupportSuiteSection basePath={basePath} />
                <SupportSurfaceStorySection />
                <ProductOverviewSection basePath={basePath} />
                <ConnectedLoopSection />
                <InstallSurfaceSection basePath={basePath} />
                <FounderFitBoundarySection />
                <PricingPreviewSection basePath={basePath} />
                <ObjectionsSection />
                <CTASection basePath={basePath} />
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
