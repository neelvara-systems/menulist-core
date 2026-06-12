import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { IconType } from 'react-icons';
import {
    LuArrowRight,
    LuBadgeCheck,
    LuBarChart3,
    LuBrain,
    LuCalendarDays,
    LuCheckCircle2,
    LuClipboardCheck,
    LuDownload,
    LuFileText,
    LuImage,
    LuLayers,
    LuMegaphone,
    LuMessageSquare,
    LuNetwork,
    LuPackageCheck,
    LuRadar,
    LuRocket,
    LuSearchCheck,
    LuShieldCheck,
    LuSparkles,
    LuStore,
    LuVideo,
    LuWalletCards,
} from 'react-icons/lu';
import {
    CAMPAIGNCUE_LOCAL_PATH_PREFIX,
    CAMPAIGNCUE_SITE_DESCRIPTION,
    CAMPAIGNCUE_SITE_TITLE,
} from './siteConfig';

export const metadata: Metadata = {
    title: CAMPAIGNCUE_SITE_TITLE,
    description: CAMPAIGNCUE_SITE_DESCRIPTION,
    alternates: { canonical: '/' },
};

type IconCard = {
    title: string;
    description: string;
    icon: IconType;
};

type StepCard = {
    title: string;
    detail: string;
    icon: IconType;
};

type CueCard = {
    label: string;
    title: string;
    detail: string;
    status: string;
};

type FoundationItem = {
    label: string;
    icon: IconType;
};

const CUE_CARDS: CueCard[] = [
    {
        label: 'Restaurant cue',
        title: 'Lunch combo needs a push',
        detail: 'Menu photo, price, and public link are ready for WhatsApp and Google.',
        status: 'Ready to pack',
    },
    {
        label: 'Salon cue',
        title: 'Open slots after 4 PM',
        detail: 'Service list and booking link are available; before/after claim needs review.',
        status: 'Trust warning',
    },
    {
        label: 'Agency cue',
        title: 'Weekly client approvals',
        detail: 'Three campaign packs are waiting for client comments and export.',
        status: 'Approval queue',
    },
];

const OUTPUTS: IconCard[] = [
    {
        title: 'WhatsApp',
        description: 'Status text, share copy, reply line, and consent-safe handoff.',
        icon: LuMessageSquare,
    },
    {
        title: 'Google local',
        description: 'Post, offer, event, photo caption, and manual publish fallback.',
        icon: LuSearchCheck,
    },
    {
        title: 'Social creative',
        description: 'Story copy, post notes, reel briefs, caption guidance, and downloadable notes.',
        icon: LuImage,
    },
    {
        title: 'Ad handoff',
        description: 'Copy variants, destination checks, policy notes, and spend approval.',
        icon: LuMegaphone,
    },
];

const PRODUCT_LOOP: IconCard[] = [
    {
        title: 'Read business data',
        description: 'Use menus, services, photos, offers, local context, source links, and optional MenuList data.',
        icon: LuStore,
    },
    {
        title: 'Pick the cue',
        description: 'Surface what is worth promoting today without starting from a blank prompt.',
        icon: LuCalendarDays,
    },
    {
        title: 'Build the pack',
        description: 'Prepare channel-specific copy, creative, scripts, exports, and approval notes from one brief.',
        icon: LuPackageCheck,
    },
    {
        title: 'Check before use',
        description: 'Block missing consent, stale source data, invented claims, and unsafe performance promises.',
        icon: LuShieldCheck,
    },
];

const LOOP_STEPS: StepCard[] = [
    {
        title: 'Source read',
        detail: 'CampaignCue reads business signals and source artifacts first.',
        icon: LuStore,
    },
    {
        title: 'Cue ranking',
        detail: 'Signals are ranked by freshness, urgency, and owner value.',
        icon: LuRadar,
    },
    {
        title: 'Pack generation',
        detail: 'One input prepares posts, notes, scripts, assets, and export-ready briefs.',
        icon: LuSparkles,
    },
    {
        title: 'Trust handoff',
        detail: 'Consent, policy checks, and claim checks must pass before execution.',
        icon: LuShieldCheck,
    },
];

const BOUNDARIES: IconCard[] = [
    {
        title: 'Separate product',
        description: 'CampaignCue has its own route, domain, flags, Firebase boundary, billing model, and workspace scope.',
        icon: LuLayers,
    },
    {
        title: 'Manual fallback',
        description: 'Copy, text download, approval, scheduling, and mark-posted flows stay available without direct integrations.',
        icon: LuDownload,
    },
    {
        title: 'Credit-safe runtime',
        description: 'Generation, rendering, publishing, analytics, and billing stay controlled by budget and capability gates.',
        icon: LuWalletCards,
    },
    {
        title: 'Source-backed claims',
        description: 'No fake UGC, fake testimonials, sales promises, ranking promises, or hidden spend.',
        icon: LuBadgeCheck,
    },
];

const BENEFITS: StepCard[] = [
    {
        title: 'Faster campaign planning',
        detail: 'Owners skip “what should I post” loops and start with practical recommendations.',
        icon: LuRocket,
    },
    {
        title: 'Less drift, more control',
        detail: 'Source-linked campaign packs reduce off-message posts and repeated manual edits.',
        icon: LuBrain,
    },
    {
        title: 'Export-first confidence',
        detail: 'Download everything and execute manually whenever integrations are not active.',
        icon: LuDownload,
    },
    {
        title: 'Team and location ready',
        detail: 'Workspace and location boundaries keep approvals and source snapshots isolated.',
        icon: LuNetwork,
    },
];

const METRICS = [
    {
        value: 'Quicker start',
        label: 'Go from blank prompt to ready queue in one pass.',
    },
    {
        value: 'Lower risk',
        label: 'Source checks reduce late posts caused by missing details.',
    },
    {
        value: 'Source locked',
        label: 'Each pack keeps evidence and checks visible from the top.',
    },
];

const TARGET_AUDIENCE = ['Salon teams', 'Restaurant owners', 'Digital agencies'];

const FOUNDATION_ITEMS: FoundationItem[] = [
    { label: 'Manual posting stays available without connected accounts', icon: LuDownload },
    { label: 'Source checks run before copy or handoff', icon: LuClipboardCheck },
    { label: 'Direct sending and ad spend stay off until approved', icon: LuShieldCheck },
    { label: 'Campaign usage is counted from owner actions', icon: LuBarChart3 },
    { label: 'Restaurant and salon claims stay tied to saved facts', icon: LuFileText },
    { label: 'Approvals and location records stay workspace-scoped', icon: LuStore },
];

const TRUST_ITEMS = [
    { label: 'Price and offer', status: 'Checked', tone: 'ok' },
    { label: 'Photo rights', status: 'Source attached', tone: 'ok' },
    { label: 'Before/after claim', status: 'Owner review', tone: 'warn' },
    { label: 'Ranking or sales promise', status: 'Blocked', tone: 'block' },
];

function getBasePath(): string {
    try {
        const headerList = headers();
        const host = headerList.get('host') || '';
        const productId = headerList.get('x-product-id');
        const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
        return productId && isLocalhost ? CAMPAIGNCUE_LOCAL_PATH_PREFIX : '';
    } catch {
        return '';
    }
}

function withBasePath(basePath: string, href: string): string {
    if (href.startsWith('#') || href.startsWith('mailto:')) return href;
    if (href === '/') return basePath || '/';
    return `${basePath}${href}`;
}

function IconCardGrid({ cards }: { cards: IconCard[] }) {
    return (
        <div className="campaigncue-card-grid">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <article className="campaigncue-card" key={card.title}>
                        <span className="campaigncue-icon" aria-hidden="true">
                            <Icon />
                        </span>
                        <h3>{card.title}</h3>
                        <p>{card.description}</p>
                    </article>
                );
            })}
        </div>
    );
}

function CampaignBoardPreview() {
    return (
        <div className="campaigncue-board" aria-label="CampaignCue campaign board preview">
            <div className="campaigncue-board-header">
                <div>
                    <span>Campaign queue</span>
                    <strong>Today</strong>
                </div>
                <span className="campaigncue-board-badge">Source-backed</span>
            </div>

            <div className="campaigncue-cue-list">
                {CUE_CARDS.map((cue) => (
                    <article className="campaigncue-cue-card" key={cue.title}>
                        <div>
                            <span>{cue.label}</span>
                            <h3>{cue.title}</h3>
                        </div>
                        <p>{cue.detail}</p>
                        <strong>{cue.status}</strong>
                    </article>
                ))}
            </div>

            <div className="campaigncue-output-strip">
                {OUTPUTS.map((output) => {
                    const Icon = output.icon;
                    return (
                        <div className="campaigncue-output-chip" key={output.title}>
                            <Icon aria-hidden="true" />
                            <span>{output.title}</span>
                        </div>
                    );
                })}
            </div>

            <div className="campaigncue-trust-panel">
                <div className="campaigncue-trust-title">
                    <LuClipboardCheck aria-hidden="true" />
                    <span>Trust check</span>
                </div>
                <div className="campaigncue-trust-list">
                    {TRUST_ITEMS.map((item) => (
                        <div className="campaigncue-trust-row" data-tone={item.tone} key={item.label}>
                            <span>{item.label}</span>
                            <strong>{item.status}</strong>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function LoopSteps({ steps }: { steps: StepCard[] }) {
    return (
        <div className="campaigncue-loop">
            {steps.map((step) => {
                const Icon = step.icon;
                return (
                    <article className="campaigncue-loop-step" key={step.title}>
                        <span className="campaigncue-loop-icon" aria-hidden="true">
                            <Icon />
                        </span>
                        <h3>{step.title}</h3>
                        <p>{step.detail}</p>
                    </article>
                );
            })}
        </div>
    );
}

export default function CampaignCueHomePage() {
    const basePath = getBasePath();

    return (
        <main className="campaigncue-site">
            <header className="campaigncue-nav">
                <a className="campaigncue-brand" href={withBasePath(basePath, '/')}>
                    <span aria-hidden="true">CC</span>
                    <strong>CampaignCue</strong>
                </a>
                <nav aria-label="CampaignCue sections">
                    <a href={withBasePath(basePath, '/app')}>App</a>
                    <a href="#workspace">Core loop</a>
                    <a href="#results">Results</a>
                    <a href="#how-it-works">How it works</a>
                    <a href="#cues">Cues</a>
                    <a href="#pack">Pack</a>
                    <a href="#trust">Trust</a>
                    <a href="#safety">Safety</a>
                </nav>
            </header>

            <section className="campaigncue-hero">
                <div className="campaigncue-hero-copy">
                    <span className="campaigncue-eyebrow">CampaignCue for restaurants, salons, and agencies</span>
                    <h1 className="campaigncue-hero-title">Campaigns from real business data, with checks before use.</h1>
                    <p>
                        Start from menus, services, offers, source links, local signals, and booking context.
                        Generate practical campaign packs and keep owner control through every step.
                    </p>
                    <div className="campaigncue-actions">
                        <a className="campaigncue-primary-action" href={withBasePath(basePath, '/app')}>
                            Open workspace
                            <LuArrowRight aria-hidden="true" />
                        </a>
                        <a className="campaigncue-secondary-action" href="#workspace">
                            See the loop
                        </a>
                    </div>
                    <p className="campaigncue-trust-note">
                        Source-backed cues, manual fallback, and trust-safe output by default.
                    </p>
                    <div className="campaigncue-hero-points">
                        <span>
                            <LuCheckCircle2 aria-hidden="true" />
                            Export/download-first execution
                        </span>
                        <span>
                            <LuShieldCheck aria-hidden="true" />
                            Consent and policy checks before handoff
                        </span>
                    </div>
                </div>
                <CampaignBoardPreview />
            </section>

            <section className="campaigncue-section" id="workspace">
                <div className="campaigncue-section-header">
                    <span>Core loop</span>
                    <h2>From business data to trusted campaign packs.</h2>
                    <p>
                        CampaignCue is shaped around a repeatable local-business workflow: data, cue, pack,
                        trust check, export or publish handoff, analytics, and the next cue.
                    </p>
                </div>
                <IconCardGrid cards={PRODUCT_LOOP} />
            </section>

            <section className="campaigncue-section campaigncue-kpi" id="results">
                <div className="campaigncue-section-header">
                    <span>Outcome signals</span>
                    <h2>Proof that the loop stays useful, not just fast.</h2>
                    <p>
                        Owners run campaign work from trusted source data and clear approvals, then execute only what is
                        still valid for their stores.
                    </p>
                </div>
                <div className="campaigncue-kpi-grid">
                    {METRICS.map((metric) => (
                        <article className="campaigncue-kpi-card" key={metric.label}>
                            <strong>{metric.value}</strong>
                            <span>{metric.label}</span>
                        </article>
                    ))}
                </div>
            </section>

            <section className="campaigncue-section campaigncue-audience-strip">
                <div className="campaigncue-section-header">
                    <span>Designed for</span>
                    <h2>Built for teams that operate in physical locations.</h2>
                </div>
                <div className="campaigncue-audience-grid" aria-label="CampaignCue customer types">
                    {TARGET_AUDIENCE.map((audience) => (
                        <span key={audience}>{audience}</span>
                    ))}
                </div>
            </section>

            <section className="campaigncue-section campaigncue-shell-grid" id="how-it-works">
                <div className="campaigncue-section-header">
                    <span>How it works</span>
                    <h2>Small actions, predictable outcomes.</h2>
                    <p>A clear sequence from signal read to owner-ready output.</p>
                </div>
                <LoopSteps steps={LOOP_STEPS} />
            </section>

            <section className="campaigncue-section campaigncue-split" id="cues">
                <div className="campaigncue-section-header">
                    <span>Opportunity engine</span>
                    <h2>The first screen answers what to promote.</h2>
                    <p>
                        CampaignCue does not begin with a blank canvas. It reads available business context and
                        recommends practical work such as a menu push, booking-slot fill, stale source fix, or local offer.
                    </p>
                </div>
                <div className="campaigncue-feature-panel">
                    <div>
                        <LuCheckCircle2 aria-hidden="true" />
                        <span>Restaurant item with price and image</span>
                    </div>
                    <div>
                        <LuCheckCircle2 aria-hidden="true" />
                        <span>Salon service with booking context</span>
                    </div>
                    <div>
                        <LuCheckCircle2 aria-hidden="true" />
                        <span>Agency approval queue across clients</span>
                    </div>
                    <div>
                        <LuCheckCircle2 aria-hidden="true" />
                        <span>Multi-location variant rules</span>
                    </div>
                </div>
            </section>

            <section className="campaigncue-section" id="pack">
                <div className="campaigncue-section-header">
                    <span>Campaign studio</span>
                    <h2>One brief prepares many local channels.</h2>
                    <p>
                        A campaign pack can include WhatsApp copy, Google local drafts, social creative notes,
                        reel briefs, text handoffs, ad variants, comments for approval, and manual export records.
                    </p>
                </div>
                <IconCardGrid cards={OUTPUTS} />
            </section>

            <section className="campaigncue-section campaigncue-benefit-section">
                <div className="campaigncue-section-header">
                    <span>Owner outcomes</span>
                    <h2>Built for action, not noise.</h2>
                    <p>
                        Keep campaigns useful for real daily operations: quick decisions, fewer errors, faster execution.
                    </p>
                </div>
                <LoopSteps steps={BENEFITS} />
            </section>

            <section className="campaigncue-section" id="trust">
                <div className="campaigncue-section-header">
                    <span>Creative trust center</span>
                    <h2>Block what should not go live.</h2>
                    <p>
                        CampaignCue treats source accuracy, consent, rights, claims, performance promises, and spend
                        approval as part of the core product.
                    </p>
                </div>
                <IconCardGrid cards={BOUNDARIES} />
            </section>

            <section className="campaigncue-section campaigncue-foundation" id="safety">
                <div className="campaigncue-foundation-copy">
                    <span>Safety boundary</span>
                    <h2>Use campaign packs manually; connected actions stay gated.</h2>
                    <p>
                        CampaignCue prepares source-backed packs for owners and teams to review, copy, schedule,
                        approve, and mark used. It does not force social or ad spend.
                    </p>
                </div>
                <div className="campaigncue-foundation-grid">
                    {FOUNDATION_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div className="campaigncue-foundation-item" key={item.label}>
                                <Icon aria-hidden="true" />
                                <span>{item.label}</span>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="campaigncue-section campaigncue-cta">
                <div>
                    <p className="campaigncue-eyebrow">Ready to use now</p>
                    <h2>From cue to campaign in your workspace.</h2>
                    <p>
                        Open the workspace, review the top cue, generate your pack, then export and execute on your workflow.
                    </p>
                    <div className="campaigncue-actions">
                        <a className="campaigncue-primary-action" href={withBasePath(basePath, '/app')}>
                            Open workspace
                            <LuArrowRight aria-hidden="true" />
                        </a>
                        <a className="campaigncue-secondary-action" href="#pack">
                            Explore campaign outputs
                        </a>
                    </div>
                </div>
                <div className="campaigncue-cta-mini">
                    <div>
                        <span>Delivery model</span>
                        <strong>Export-first</strong>
                    </div>
                    <div>
                        <span>Boundary</span>
                        <strong>No direct spend without approval</strong>
                    </div>
                    <div>
                        <span>Source policy</span>
                        <strong>Trust checks before handoff</strong>
                    </div>
                </div>
            </section>

            <footer className="campaigncue-footer">
                <div>
                    <strong>CampaignCue</strong>
                    <span>Campaign packs from real business data.</span>
                </div>
                <div className="campaigncue-footer-links">
                    <span>
                        <LuShieldCheck aria-hidden="true" />
                        Source checks
                    </span>
                    <span>
                        <LuVideo aria-hidden="true" />
                        Video-ready
                    </span>
                    <span>
                        <LuBarChart3 aria-hidden="true" />
                        Confidence-labeled analytics
                    </span>
                </div>
            </footer>
        </main>
    );
}
