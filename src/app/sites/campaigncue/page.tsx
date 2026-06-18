import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { IconType } from 'react-icons';
import {
    LuArrowRight,
    LuBadgeCheck,
    LuBarChart3,
    LuBrain,
    LuBrush,
    LuCalendarClock,
    LuCheckCircle2,
    LuChevronRight,
    LuClipboardCheck,
    LuCopy,
    LuDownload,
    LuFileDown,
    LuFileText,
    LuHelpCircle,
    LuImage,
    LuLayers,
    LuLayoutDashboard,
    LuLink,
    LuMegaphone,
    LuMessageSquare,
    LuMousePointerClick,
    LuPalette,
    LuPlaySquare,
    LuRadar,
    LuRefreshCcw,
    LuScissors,
    LuSearchCheck,
    LuShieldAlert,
    LuShieldCheck,
    LuSparkles,
    LuStore,
    LuUpload,
    LuVideo,
    LuWalletCards,
    LuWorkflow,
} from 'react-icons/lu';
import {
    CAMPAIGNCUE_LOCAL_PATH_PREFIX,
    CAMPAIGNCUE_SITE_DESCRIPTION,
    CAMPAIGNCUE_SITE_TITLE,
    buildCampaignCueUrl,
} from './siteConfig';

export const metadata: Metadata = {
    title: CAMPAIGNCUE_SITE_TITLE,
    description: CAMPAIGNCUE_SITE_DESCRIPTION,
    alternates: { canonical: buildCampaignCueUrl('/') },
};

type IconCard = {
    title: string;
    description: string;
    icon: IconType;
};

type WorkflowStep = {
    label: string;
    title: string;
    detail: string;
    icon: IconType;
};

type OutputFormat = {
    title: string;
    description: string;
    icon: IconType;
    status: string;
};

type PromptExample = {
    title: string;
    detail: string;
};

type LocalProof = {
    title: string;
    detail: string;
    proof: string;
};

type CatalogItem = {
    group: string;
    title: string;
    detail: string;
    tag: string;
    icon: IconType;
};

type FooterGroup = {
    title: string;
    links: Array<{
        label: string;
        href: string;
    }>;
};

const NAV_LINKS = [
    { label: 'Today', href: '#daily-desk' },
    { label: 'Packs', href: '#studio' },
    { label: 'Index', href: '#catalog' },
    { label: 'Examples', href: '#starts' },
    { label: 'Trust', href: '#trust' },
    { label: 'FAQ', href: '#faq' },
];

const HERO_PILLS = [
    'Starts from real business facts',
    'Exports before it posts',
    'Risky claims stay visible',
];

const FIT_ITEMS = [
    "Today's cue",
    'Checked facts',
    'WhatsApp + Google',
    'Creative + print',
    'Manual handoff',
    'Result memory',
];

const OUTPUTS: OutputFormat[] = [
    {
        title: 'WhatsApp pack',
        description: 'Status text, reply line, image note, and consent reminder ready for manual sharing.',
        icon: LuMessageSquare,
        status: 'Copy ready',
    },
    {
        title: 'Google local draft',
        description: 'Offer, event, update, photo caption, and clear manual publish steps.',
        icon: LuSearchCheck,
        status: 'Source checked',
    },
    {
        title: 'Social creative',
        description: 'Downloadable square, story, poster, and caption variants for the same offer.',
        icon: LuImage,
        status: 'Editable',
    },
    {
        title: 'Print and staff pack',
        description: 'Counter poster, flyer note, coupon or QR card, staff share text, and a short counter script.',
        icon: LuFileDown,
        status: 'Use in store',
    },
    {
        title: 'Reel brief',
        description: 'Hook, shot list, staff script, caption, and safe claims.',
        icon: LuVideo,
        status: 'Shoot ready',
    },
    {
        title: 'UGC script',
        description: 'Creator instructions, proof points, usage notes, and safe review flags.',
        icon: LuPlaySquare,
        status: 'Reviewable',
    },
    {
        title: 'Email, SMS, and QR brief',
        description: 'Subject line, short SMS, offer-page brief, CTA link, QR note, and follow-up reminder.',
        icon: LuLink,
        status: 'Handoff ready',
    },
    {
        title: 'Ad handoff',
        description: 'Copy variants, audience note, destination check, and spend approval.',
        icon: LuMegaphone,
        status: 'Spend gated',
    },
];

const WORKFLOW_STEPS: WorkflowStep[] = [
    {
        label: '01',
        title: 'Read the business facts',
        detail: 'Offers, items, services, photos, hours, links, source notes, and owner inputs become the campaign base.',
        icon: LuStore,
    },
    {
        label: '02',
        title: 'Pick the useful cue',
        detail: 'CampaignCue suggests practical work: promote an item, fill a slot, refresh an offer, or prepare a local update.',
        icon: LuRadar,
    },
    {
        label: '03',
        title: 'Prepare the pack',
        detail: 'One cue becomes channel text, creative notes, scripts, approval notes, manual tasks, and export files.',
        icon: LuSparkles,
    },
    {
        label: '04',
        title: 'Check the risky parts',
        detail: 'Price, consent, photo rights, source freshness, sales promises, ranking claims, and ad spend are checked before handoff.',
        icon: LuShieldCheck,
    },
    {
        label: '05',
        title: 'Export, post, remember',
        detail: 'Download the pack, copy text, mark what was used, and reuse approved work without connecting social accounts.',
        icon: LuDownload,
    },
];

const OWNER_DAY_STEPS: IconCard[] = [
    {
        title: 'Open Today',
        description: 'See one recommended cue instead of staring at an empty content box.',
        icon: LuLayoutDashboard,
    },
    {
        title: 'Confirm the facts',
        description: 'Add price, photo, service, booking link, or event detail only when the pack needs it.',
        icon: LuBadgeCheck,
    },
    {
        title: 'Download the pack',
        description: 'Use WhatsApp text, Google fields, social creative, reel brief, or print handoff manually.',
        icon: LuDownload,
    },
    {
        title: 'Mark what happened',
        description: 'Record posted, skipped, booked, sold, or needs follow-up so the next cue gets better.',
        icon: LuBarChart3,
    },
];

const LOCAL_PROOFS: LocalProof[] = [
    {
        title: 'Lunch combo push',
        detail: 'Photo, price, pickup link, Google update, WhatsApp status, and table-card download.',
        proof: 'Price and public link checked',
    },
    {
        title: 'Salon slot fill',
        detail: '4 PM opening, service copy, booking note, story asset, and before/after claim review.',
        proof: 'Booking link ready',
    },
    {
        title: 'Local service callout',
        detail: 'Area served, availability, phone CTA, proof note, and manual posting checklist.',
        proof: 'No unsupported promise',
    },
];

const CATALOG_ITEMS: CatalogItem[] = [
    {
        group: 'Start',
        title: 'Today cue',
        detail: 'One practical thing to promote, pulled from current business facts and missing detail prompts.',
        tag: 'First screen',
        icon: LuLayoutDashboard,
    },
    {
        group: 'Start',
        title: 'Offer facts',
        detail: 'Price, date, slot, service, product, link, photo, or rule that the pack is allowed to use.',
        tag: 'Owner input',
        icon: LuFileText,
    },
    {
        group: 'Pack',
        title: 'WhatsApp and Google',
        detail: 'Manual-ready message, local update, CTA, image note, and publish checklist for the same cue.',
        tag: 'Channel pack',
        icon: LuMessageSquare,
    },
    {
        group: 'Pack',
        title: 'Creative and print',
        detail: 'Square, story, poster, table card, shelf note, or staff handoff copy from one source-backed pack.',
        tag: 'Asset pack',
        icon: LuImage,
    },
    {
        group: 'Review',
        title: 'Claim check',
        detail: 'Sales promises, ranking claims, before/after copy, consent, and sensitive wording stay visible.',
        tag: 'Safety',
        icon: LuShieldAlert,
    },
    {
        group: 'Review',
        title: 'Image reuse',
        detail: 'CueLayers can keep a flat-safe fallback while editable candidates remain reviewable.',
        tag: 'CueLayers',
        icon: LuLayers,
    },
    {
        group: 'Handoff',
        title: 'Manual export',
        detail: 'Download assets, copy channel text, create a manual schedule task, or send for approval.',
        tag: 'No direct post',
        icon: LuDownload,
    },
    {
        group: 'Handoff',
        title: 'Result memory',
        detail: 'Mark used, skipped, booked, sold, or needs follow-up so the next cue has better context.',
        tag: 'Learning',
        icon: LuBarChart3,
    },
];

const PRODUCT_CAPABILITIES: IconCard[] = [
    {
        title: 'Daily Campaign Desk',
        description: 'The first screen tells owners what to promote today, what is missing, and what is ready to export.',
        icon: LuLayoutDashboard,
    },
    {
        title: 'Saved business facts',
        description: 'Menus, services, brand details, local context, links, and proof stay attached to campaign packs.',
        icon: LuBrain,
    },
    {
        title: 'Campaign Studio',
        description: 'One local opportunity turns into WhatsApp, Google, social, video, and ad handoff outputs.',
        icon: LuWorkflow,
    },
    {
        title: 'Creative Studio',
        description: 'Editable designs, Design Cue commands, resize presets, and export checks stay in one editor.',
        icon: LuPalette,
    },
    {
        title: 'CueLayers',
        description: 'Uploaded or generated flat images can become editable layer candidates with safe fallbacks and review flags.',
        icon: LuLayers,
    },
    {
        title: 'Creative Trust Center',
        description: 'Every risky claim, missing proof, stale detail, or spend action is visible before the owner uses the pack.',
        icon: LuClipboardCheck,
    },
];

const STARTING_POINTS: PromptExample[] = [
    {
        title: 'Restaurant',
        detail: 'Push today\'s best item with price, photo, WhatsApp text, Google post, and a table-card download.',
    },
    {
        title: 'Salon',
        detail: 'Fill late afternoon slots with service copy, story text, booking note, and before/after claim review.',
    },
    {
        title: 'Retail shop',
        detail: 'Turn new stock, a weekend offer, and store hours into a poster, story, Google update, and shelf note.',
    },
    {
        title: 'Local service',
        detail: 'Promote a repair slot, consultation, seasonal service, or urgent availability with proof-safe copy.',
    },
    {
        title: 'Fitness studio',
        detail: 'Prepare class-fill messages, trial-offer posts, member referral text, and a weekly story sequence.',
    },
    {
        title: 'Clinic',
        detail: 'Create awareness and appointment reminders with cautious wording, source checks, and manual review.',
    },
    {
        title: 'Agency',
        detail: 'Prepare weekly packs for three clients with approvals, comments, exports, and source-linked notes.',
    },
    {
        title: 'Multi-location',
        detail: 'Create one campaign with location-safe variants, local hours, local offers, and partial approval.',
    },
];

const TRUST_ROWS = [
    { label: 'Price, hours, and link', result: 'Source checked', tone: 'ok' },
    { label: 'Photo and asset rights', result: 'Attached', tone: 'ok' },
    { label: 'Sensitive result claim', result: 'Owner review', tone: 'warn' },
    { label: 'Guaranteed sales or ranking', result: 'Blocked', tone: 'block' },
    { label: 'Direct publish or spend', result: 'Disabled', tone: 'block' },
];

const OWNER_OUTCOMES: IconCard[] = [
    {
        title: 'Start without a blank prompt',
        description: 'Owners see a recommended cue and missing details instead of an empty generator.',
        icon: LuMousePointerClick,
    },
    {
        title: 'Keep facts attached',
        description: 'Menus, services, dates, booking links, proof, and source snapshots remain visible with the pack.',
        icon: LuFileText,
    },
    {
        title: 'Move faster on mobile',
        description: 'Copy, download, schedule, approve, and mark-used actions stay simple on owner phones.',
        icon: LuCopy,
    },
    {
        title: 'Control cost and risk',
        description: 'Generation, export choices, and ad spend decisions stay visible before the owner commits.',
        icon: LuWalletCards,
    },
];

const FAQ_ITEMS = [
    {
        question: 'Does CampaignCue publish directly to Instagram, Google, or WhatsApp?',
        answer: 'No. The active product is export/download-first. It creates packs owners can copy, download, schedule manually, approve, or mark used. Direct account posting is not part of the active delivery mode.',
    },
    {
        question: 'Is this only for MenuList restaurants?',
        answer: 'No. MenuList can be a read-only restaurant source, but salons, agencies, and non-MenuList businesses can use owner-entered sources and uploaded assets.',
    },
    {
        question: 'How is this different from a generic design tool?',
        answer: 'CampaignCue starts from business facts and local campaign opportunities. The editor exists to finish campaign assets, not to become a generic blank-canvas design product.',
    },
    {
        question: 'Do owners only get social posts?',
        answer: 'No. A campaign pack can include WhatsApp text and images, Google local fields, social assets, print and in-store material, staff messages, email or SMS copy, QR or offer-page notes, trust checks, and a result prompt.',
    },
    {
        question: 'Can owners reuse existing images?',
        answer: 'Yes. CueLayers treats uploaded or generated flat images as editable candidates when reconstruction is safe, with protected text, source truth, and a flat fallback when reconstruction is uncertain.',
    },
];

const FOOTER_GROUPS: FooterGroup[] = [
    {
        title: 'Product',
        links: [
            { label: 'Daily Campaign Desk', href: '#daily-desk' },
            { label: 'Campaign Studio', href: '#studio' },
            { label: 'Creative Studio', href: '#editor' },
            { label: 'CueLayers', href: '#cuelayers' },
        ],
    },
    {
        title: 'Workflows',
        links: [
            { label: 'Restaurants', href: '#starts' },
            { label: 'Salons', href: '#starts' },
            { label: 'Retail and services', href: '#starts' },
            { label: 'Agencies', href: '#use-cases' },
        ],
    },
    {
        title: 'Trust',
        links: [
            { label: 'Safety boundary', href: '#trust' },
            { label: 'Export-first delivery', href: '#delivery' },
            { label: 'Source checks', href: '#trust' },
            { label: 'FAQ', href: '#faq' },
        ],
    },
    {
        title: 'Company',
        links: [
            { label: 'Open workspace', href: '/app' },
            { label: 'Product loop', href: '#workflow' },
            { label: 'Owner outcomes', href: '#editor' },
            { label: 'Use cases', href: '#use-cases' },
        ],
    },
];

const JSON_LD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'SoftwareApplication',
            name: 'CampaignCue',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: buildCampaignCueUrl('/'),
            description: CAMPAIGNCUE_SITE_DESCRIPTION,
        },
        {
            '@type': 'FAQPage',
            mainEntity: FAQ_ITEMS.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.answer,
                },
            })),
        },
    ],
};

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

function BrandMark() {
    return (
        <span className="campaigncue-brand-mark" aria-hidden="true">
            <LuMegaphone />
        </span>
    );
}

function SectionIntro({
    eyebrow,
    title,
    children,
}: {
    eyebrow: string;
    title: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="campaigncue-section-intro">
            <span>{eyebrow}</span>
            <h2>{title}</h2>
            {children ? <p>{children}</p> : null}
        </div>
    );
}

function HeroProductPreview() {
    return (
        <div className="campaigncue-hero-visual" aria-label="CampaignCue product preview">
            <div className="campaigncue-preview-window">
                <div className="campaigncue-window-bar">
                    <span />
                    <span />
                    <span />
                    <strong>Daily desk</strong>
                </div>
                <div className="campaigncue-preview-grid">
                    <aside className="campaigncue-preview-rail" aria-label="Preview navigation">
                        <span className="is-active">Today</span>
                        <span>Sources</span>
                        <span>Studio</span>
                        <span>Trust</span>
                    </aside>

                    <section className="campaigncue-preview-main" aria-label="Today cue preview">
                        <div className="campaigncue-preview-kicker">
                            <LuRadar aria-hidden="true" />
                            <span>Ready after fact check</span>
                        </div>
                        <h2>Promote the lunch combo before 2 PM.</h2>
                        <p>Photo, price, pickup link, Google update, WhatsApp status, and counter card are ready.</p>
                        <div className="campaigncue-preview-proof">
                            <span>
                                <LuCheckCircle2 aria-hidden="true" />
                                Price checked
                            </span>
                            <span>
                                <LuShieldAlert aria-hidden="true" />
                                No ranking claim
                            </span>
                        </div>
                        <div className="campaigncue-preview-actions">
                            <span>Copy WhatsApp</span>
                            <span>Download poster</span>
                            <span>Google draft</span>
                        </div>
                    </section>

                    <section className="campaigncue-preview-pack" aria-label="Generated campaign pack">
                        {OUTPUTS.slice(0, 4).map((output) => {
                            const Icon = output.icon;
                            return (
                                <div className="campaigncue-pack-row" key={output.title}>
                                    <Icon aria-hidden="true" />
                                    <div>
                                        <strong>{output.title}</strong>
                                        <span>{output.status}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                </div>
            </div>
        </div>
    );
}

function WorkflowRail() {
    return (
        <div className="campaigncue-workflow-rail">
            {WORKFLOW_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                    <div className="campaigncue-workflow-step" key={step.title}>
                        <span className="campaigncue-workflow-marker">
                            <span>{step.label}</span>
                            <Icon aria-hidden="true" />
                        </span>
                        <div>
                            <h3>{step.title}</h3>
                            <p>{step.detail}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function BenefitList({ cards }: { cards: IconCard[] }) {
    return (
        <div className="campaigncue-benefit-list">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div className="campaigncue-benefit-row" key={card.title}>
                        <span aria-hidden="true">
                            <Icon />
                        </span>
                        <div>
                            <strong>{card.title}</strong>
                            <p>{card.description}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function OutputGrid() {
    return (
        <div className="campaigncue-output-ledger">
            {OUTPUTS.map((output) => {
                const Icon = output.icon;
                return (
                    <div className="campaigncue-output-row" key={output.title}>
                        <span className="campaigncue-output-icon" aria-hidden="true">
                            <Icon />
                        </span>
                        <div>
                            <strong>{output.title}</strong>
                            <p>{output.description}</p>
                        </div>
                        <span className="campaigncue-output-status">{output.status}</span>
                    </div>
                );
            })}
        </div>
    );
}

function CapabilityLedger({ cards }: { cards: IconCard[] }) {
    return (
        <div className="campaigncue-capability-ledger">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div className="campaigncue-capability-row" key={card.title}>
                        <span aria-hidden="true">
                            <Icon />
                        </span>
                        <div>
                            <strong>{card.title}</strong>
                            <p>{card.description}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function PromptStarts() {
    return (
        <div className="campaigncue-start-list">
            {STARTING_POINTS.map((start) => (
                <div className="campaigncue-start-row" key={start.title}>
                    <strong>{start.title}</strong>
                    <p>{start.detail}</p>
                    <LuChevronRight aria-hidden="true" />
                </div>
            ))}
        </div>
    );
}

function OwnerDayPath() {
    return (
        <section className="campaigncue-owner-path" aria-label="How owners use CampaignCue">
            <div className="campaigncue-owner-path-intro">
                <span>Owner path</span>
                <strong>Four plain moves, no marketing calendar required.</strong>
            </div>
            <ol>
                {OWNER_DAY_STEPS.map((step, index) => {
                    const Icon = step.icon;
                    return (
                        <li key={step.title}>
                            <span>{String(index + 1).padStart(2, '0')}</span>
                            <Icon aria-hidden="true" />
                            <div>
                                <strong>{step.title}</strong>
                                <p>{step.description}</p>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

function RealWorkProof() {
    return (
        <section className="campaigncue-real-work" aria-label="Concrete CampaignCue examples">
            <div className="campaigncue-real-work-copy">
                <span>Real work, not filler</span>
                <h2>Every pack shows the fact behind the campaign.</h2>
                <p>
                    A campaign pack should feel like it came from the owner&apos;s actual day: a price,
                    an open slot, a product photo, a booking link, a service area, or a proof note.
                </p>
            </div>
            <div className="campaigncue-real-work-ledger">
                {LOCAL_PROOFS.map((item) => (
                    <div className="campaigncue-real-work-row" key={item.title}>
                        <div>
                            <strong>{item.title}</strong>
                            <p>{item.detail}</p>
                        </div>
                        <span>
                            <LuShieldCheck aria-hidden="true" />
                            {item.proof}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function CampaignCueCatalog() {
    const groups = Array.from(new Set(CATALOG_ITEMS.map((item) => item.group)));

    return (
        <section className="campaigncue-catalog" id="catalog" aria-label="CampaignCue pack index">
            <aside className="campaigncue-catalog-rail" aria-label="CampaignCue pack categories">
                <span>Pack index</span>
                <h2>Browse by owner job.</h2>
                <nav>
                    {groups.map((group) => (
                        <a href={`#catalog-${group.toLowerCase()}`} key={group}>
                            {group}
                        </a>
                    ))}
                </nav>
            </aside>
            <div className="campaigncue-catalog-list">
                {groups.map((group) => (
                    <section id={`catalog-${group.toLowerCase()}`} key={group}>
                        <h3>{group}</h3>
                        {CATALOG_ITEMS.filter((item) => item.group === group).map((item) => {
                            const Icon = item.icon;
                            return (
                                <div className="campaigncue-catalog-row" key={`${item.group}-${item.title}`}>
                                    <Icon aria-hidden="true" />
                                    <div>
                                        <strong>{item.title}</strong>
                                        <p>{item.detail}</p>
                                    </div>
                                    <span>{item.tag}</span>
                                </div>
                            );
                        })}
                    </section>
                ))}
            </div>
        </section>
    );
}

function TrustMatrix() {
    return (
        <div className="campaigncue-trust-matrix">
            <div className="campaigncue-trust-heading">
                <LuShieldCheck aria-hidden="true" />
                <div>
                    <span>Creative Trust Center</span>
                    <strong>Checks before handoff</strong>
                </div>
            </div>
            {TRUST_ROWS.map((row) => (
                <div className="campaigncue-trust-row" data-tone={row.tone} key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.result}</strong>
                </div>
            ))}
        </div>
    );
}

function FooterLinks({ basePath }: { basePath: string }) {
    return (
        <div className="campaigncue-footer-groups">
            {FOOTER_GROUPS.map((group) => (
                <nav aria-label={group.title} key={group.title}>
                    <h3>{group.title}</h3>
                    {group.links.map((link) => (
                        <a href={withBasePath(basePath, link.href)} key={link.label}>
                            {link.label}
                        </a>
                    ))}
                </nav>
            ))}
        </div>
    );
}

export default function CampaignCueHomePage() {
    const basePath = getBasePath();

    return (
        <main className="campaigncue-site">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
            />
            <header className="campaigncue-nav">
                <a className="campaigncue-brand" href={withBasePath(basePath, '/')}>
                    <BrandMark />
                    <strong>CampaignCue</strong>
                </a>
                <nav aria-label="CampaignCue website sections">
                    {NAV_LINKS.map((link) => (
                        <a href={link.href} key={link.label}>
                            {link.label}
                        </a>
                    ))}
                </nav>
                <a className="campaigncue-nav-action" href={withBasePath(basePath, '/app')}>
                    App
                    <LuArrowRight aria-hidden="true" />
                </a>
            </header>

            <section className="campaigncue-hero">
                <div className="campaigncue-hero-copy">
                    <span className="campaigncue-eyebrow">Daily campaign desk for local businesses</span>
                    <h1>CampaignCue</h1>
                    <p>
                        Know what to promote today. Get the WhatsApp text, Google update, social creative,
                        print note, video brief, and safety checks in one source-backed pack.
                    </p>
                    <div className="campaigncue-actions">
                        <a className="campaigncue-primary-action" href={withBasePath(basePath, '/app')}>
                            Open workspace
                            <LuArrowRight aria-hidden="true" />
                        </a>
                        <a className="campaigncue-secondary-action" href="#studio">
                            See pack examples
                        </a>
                    </div>
                    <div className="campaigncue-hero-pills" aria-label="CampaignCue launch boundaries">
                        {HERO_PILLS.map((pill) => (
                            <span key={pill}>
                                <LuCheckCircle2 aria-hidden="true" />
                                {pill}
                            </span>
                        ))}
                    </div>
                </div>
                <HeroProductPreview />
            </section>

            <section className="campaigncue-proof-strip" aria-label="CampaignCue fit">
                {FIT_ITEMS.map((item) => (
                    <span key={item}>{item}</span>
                ))}
            </section>

            <RealWorkProof />

            <CampaignCueCatalog />

            <OwnerDayPath />

            <section className="campaigncue-section" id="workflow">
                <SectionIntro eyebrow="Workflow" title="A simple daily loop from business fact to usable campaign pack.">
                    The product behaves like an operating desk, not a blank design tool: pick the cue,
                    confirm missing facts, export the work, and keep a memory of what happened.
                </SectionIntro>
                <WorkflowRail />
            </section>

            <section className="campaigncue-section campaigncue-band" id="daily-desk">
                <div className="campaigncue-band-copy">
                    <span>First screen</span>
                    <h2>The first screen tells owners what to do next.</h2>
                    <p>
                        Owners should not need to understand content strategy before creating a useful post.
                        The desk shows one recommended action, missing details, ready outputs, print/photo tasks,
                        and previous results in plain language.
                    </p>
                </div>
                <div className="campaigncue-desk-preview" aria-label="Daily Campaign Desk preview">
                    <div className="campaigncue-desk-main">
                        <span>Recommended today</span>
                        <strong>Lunch combo needs a push</strong>
                        <p>Photo, price, and public link are ready. Export the pack and mark posted.</p>
                    </div>
                    <div className="campaigncue-desk-list">
                        <span>
                            <LuFileDown aria-hidden="true" />
                            Full pack download
                        </span>
                        <span>
                            <LuCalendarClock aria-hidden="true" />
                            Manual schedule task
                        </span>
                        <span>
                            <LuBarChart3 aria-hidden="true" />
                            Owner-reported outcome
                        </span>
                    </div>
                </div>
            </section>

            <section className="campaigncue-section" id="studio">
                <SectionIntro eyebrow="Outputs" title="One campaign cue, many owner-ready pieces.">
                    CampaignCue separates creative preparation from account posting. The product creates
                    practical files, text, briefs, and checklists that an owner or agency can use immediately.
                </SectionIntro>
                <OutputGrid />
            </section>

            <section className="campaigncue-section campaigncue-split" id="editor">
                <div>
                    <SectionIntro eyebrow="Creative Studio" title="Make campaign assets editable without losing the source checks.">
                        CampaignCue uses the shared Creative Editor through a product adapter. Design Cue commands,
                        guided edit tools, resize presets, export checks, and campaign context stay connected.
                    </SectionIntro>
                    <BenefitList cards={OWNER_OUTCOMES} />
                </div>
                <div className="campaigncue-editor-preview" aria-label="Creative Studio preview">
                    <div className="campaigncue-editor-toolbar">
                        <span>Square post</span>
                        <strong>Source locked</strong>
                    </div>
                    <div className="campaigncue-editor-canvas">
                        <span className="campaigncue-editor-tag">Fresh menu item</span>
                        <strong>Paneer tikka lunch bowl</strong>
                        <p>Today 12-3 PM</p>
                    </div>
                    <div className="campaigncue-editor-side">
                        <span>
                            <LuBrush aria-hidden="true" />
                            Improve layout
                        </span>
                        <span>
                            <LuShieldCheck aria-hidden="true" />
                            Check facts
                        </span>
                        <span>
                            <LuDownload aria-hidden="true" />
                            Export PNG
                        </span>
                    </div>
                </div>
            </section>

            <section className="campaigncue-section campaigncue-band campaigncue-band-reverse" id="cuelayers">
                <div className="campaigncue-cuelayers-preview" aria-label="CueLayers preview">
                    <div className="campaigncue-layer-source">
                        <LuUpload aria-hidden="true" />
                        <span>Uploaded flat image</span>
                    </div>
                    <div className="campaigncue-layer-arrow">
                        <LuArrowRight aria-hidden="true" />
                    </div>
                    <div className="campaigncue-layer-stack">
                        <span>Text layer</span>
                        <span>Offer block</span>
                        <span>Photo layer</span>
                        <span>Safe fallback</span>
                    </div>
                </div>
                <div className="campaigncue-band-copy">
                    <span>CueLayers</span>
                    <h2>Reuse existing images instead of starting over.</h2>
                    <p>
                        Uploaded images and generated flat assets can become editable layer candidates.
                        Text truth, rights checks, source snapshots, and flat-safe fallback keep the feature
                        useful without pretending to recover a perfect source file.
                    </p>
                    <div className="campaigncue-inline-checks">
                        <span>
                            <LuScissors aria-hidden="true" />
                            Layer candidates
                        </span>
                        <span>
                            <LuRefreshCcw aria-hidden="true" />
                            Repair path
                        </span>
                        <span>
                            <LuShieldCheck aria-hidden="true" />
                            Review flags
                        </span>
                    </div>
                </div>
            </section>

            <section className="campaigncue-section" id="starts">
                <SectionIntro eyebrow="Examples" title="Owners start with their business type, not a blank prompt.">
                    These are the kinds of plain requests CampaignCue can turn into structured packs once the
                    business facts and owner inputs are available.
                </SectionIntro>
                <PromptStarts />
            </section>

            <section className="campaigncue-section campaigncue-split" id="trust">
                <div>
                    <SectionIntro eyebrow="Trust And Safety" title="CampaignCue blocks work that should not go live.">
                        Human review is part of the product. Claim checks, source checks, spend gates, rights notes,
                        and delivery boundaries stay visible before the owner exports or uses anything.
                    </SectionIntro>
                    <div className="campaigncue-trust-points">
                        <span>
                            <LuBadgeCheck aria-hidden="true" />
                            Source-backed copy
                        </span>
                        <span>
                            <LuShieldAlert aria-hidden="true" />
                            Unsafe claim warnings
                        </span>
                        <span>
                            <LuWalletCards aria-hidden="true" />
                            Cost gates for paid actions
                        </span>
                    </div>
                </div>
                <TrustMatrix />
            </section>

            <section className="campaigncue-section campaigncue-band" id="delivery">
                <div className="campaigncue-band-copy">
                    <span>Delivery Boundary</span>
                    <h2>Day one is export-first by design.</h2>
                    <p>
                        CampaignCue creates, checks, downloads, copies, schedules manual tasks, and records
                        outcomes. It does not silently connect accounts, publish posts, send WhatsApp messages,
                        or spend ad budget.
                    </p>
                </div>
                <div className="campaigncue-delivery-list">
                    <span>
                        <LuDownload aria-hidden="true" />
                        Download assets
                    </span>
                    <span>
                        <LuCopy aria-hidden="true" />
                        Copy channel text
                    </span>
                    <span>
                        <LuCalendarClock aria-hidden="true" />
                        Schedule manual work
                    </span>
                    <span>
                        <LuClipboardCheck aria-hidden="true" />
                        Mark used and report result
                    </span>
                </div>
            </section>

            <section className="campaigncue-section" id="use-cases">
                <SectionIntro eyebrow="Use Cases" title="Built for the messy daily work of physical-location marketing.">
                    The product is intentionally local-business first: campaigns need facts, timing, source proof,
                    approvals, and usable exports more than another content feed.
                </SectionIntro>
                <CapabilityLedger cards={PRODUCT_CAPABILITIES} />
            </section>

            <section className="campaigncue-section campaigncue-faq" id="faq">
                <SectionIntro eyebrow="FAQ" title="Clear answers before anyone opens the app." />
                <div className="campaigncue-faq-list">
                    {FAQ_ITEMS.map((item) => (
                        <details key={item.question}>
                            <summary>
                                <LuHelpCircle aria-hidden="true" />
                                {item.question}
                            </summary>
                            <p>{item.answer}</p>
                        </details>
                    ))}
                </div>
            </section>

            <section className="campaigncue-final-cta">
                <div>
                    <span>Ready when the owner is</span>
                    <h2>Open the workspace, pick the cue, export the pack.</h2>
                    <p>
                        CampaignCue keeps the daily marketing loop understandable: source data in,
                        campaign pack out, owner control all the way through.
                    </p>
                </div>
                <a className="campaigncue-primary-action" href={withBasePath(basePath, '/app')}>
                    Open workspace
                    <LuArrowRight aria-hidden="true" />
                </a>
            </section>

            <footer className="campaigncue-footer">
                <div className="campaigncue-footer-brand">
                    <a className="campaigncue-brand" href={withBasePath(basePath, '/')}>
                        <BrandMark />
                        <strong>CampaignCue</strong>
                    </a>
                    <p>Campaign packs from real business data, checked before use.</p>
                    <div>
                        <span>
                            <LuLink aria-hidden="true" />
                            Source backed
                        </span>
                        <span>
                            <LuDownload aria-hidden="true" />
                            Export first
                        </span>
                    </div>
                </div>
                <FooterLinks basePath={basePath} />
                <div className="campaigncue-footer-bottom">
                    <span>© 2026 CampaignCue</span>
                    <span>Export-first delivery. Direct account posting is outside the active delivery mode.</span>
                </div>
            </footer>
        </main>
    );
}
