import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { IconType } from 'react-icons';
import { CAMPAIGNCUE_WEBSITE_FEATURE_PATHS } from '@constant/campaigncue/websiteFeatures';
import { CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS } from '@constant/campaigncue/websiteUseCases';
import {
    LuArrowRight,
    LuBadgeCheck,
    LuBarChart3,
    LuCalendarClock,
    LuCheckCircle2,
    LuChevronDown,
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
    LuPalette,
    LuRadar,
    LuRefreshCcw,
    LuSearchCheck,
    LuShieldAlert,
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
    buildCampaignCueUrl,
} from './siteConfig';
import CampaignCueAiSummary from './components/CampaignCueAiSummary';
import CampaignCueMobileNavigation from './components/CampaignCueMobileNavigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: CAMPAIGNCUE_SITE_TITLE,
    description: CAMPAIGNCUE_SITE_DESCRIPTION,
    alternates: { canonical: buildCampaignCueUrl('/') },
};

function serializeJsonLd(data: Record<string, unknown>): string {
    return JSON.stringify(data).replace(/</g, '\\u003c');
}

type WorkflowStep = {
    label: string;
    title: string;
    detail: string;
    icon: IconType;
};

type PackRoomColumn = {
    title: string;
    description: string;
    icon: IconType;
    items: Array<{
        label: string;
        status: string;
    }>;
};

type PowerhouseFeature = {
    label: string;
    title: string;
    description: string;
    icon: IconType;
    tone: string;
    artifacts: [string, string, string];
};

type FeatureDockItem = {
    title: string;
    detail: string;
    href: string;
    icon: IconType;
    artifacts: [string, string, string];
};

type TrustMatrixRow = {
    claim: string;
    source: string;
    risk: string;
    action: string;
    tone: string;
};

type FooterGroup = {
    title: string;
    links: Array<{
        label: string;
        href: string;
    }>;
};

type CampaignCueProofImage = {
    src: string;
    alt: string;
    caption: string;
};

type HeroFloatingAsset = {
    eyebrow: string;
    title: string;
    detail: string;
    tone: 'rose' | 'pink' | 'blue' | 'purple' | 'cream';
};

const CAMPAIGNCUE_PRODUCT_PROOF_IMAGES = {
    hero: {
        src: '/campaigncue-website-assets/dummy/campaigncue-home-hero-daily-desk.webp',
        alt: 'Sample CampaignCue daily desk showing a local lunch cue, source facts, campaign pack outputs, story asset, and export-first state.',
        caption: 'Sample CampaignCue daily-desk output with dummy business data.',
    },
    packRoom: {
        src: '/campaigncue-website-assets/dummy/campaigncue-pack-room-export-pack.webp',
        alt: 'Sample CampaignCue pack room showing owner-ready pieces, proof beside the work, and manual delivery controls.',
        caption: 'Dummy pack room showing grouped outputs, proof notes, and manual handoff.',
    },
    creativeSystem: {
        src: '/campaigncue-website-assets/dummy/campaigncue-creative-output-system.webp',
        alt: 'Sample CampaignCue creative output system showing WhatsApp, Google local, story creative, poster, reel brief, proof deck, staff note, and result memory tiles.',
        caption: 'Dummy creative-output set aligned to CampaignCue export-first assets.',
    },
} satisfies Record<string, CampaignCueProofImage>;

const HERO_FLOATING_ASSETS: HeroFloatingAsset[] = [
    { eyebrow: 'Story', title: 'Lunch combo frame', detail: 'Download', tone: 'rose' },
    { eyebrow: 'Poster', title: 'Counter card', detail: 'Print note', tone: 'pink' },
    { eyebrow: 'Google', title: 'Local update', detail: 'Manual publish', tone: 'blue' },
    { eyebrow: 'Reel', title: 'Short video', detail: 'Local render', tone: 'purple' },
    { eyebrow: 'Review', title: 'Claim check', detail: 'Owner action', tone: 'cream' },
];

const NAV_LINKS = [
    { label: 'Pack room', href: '#pack-room' },
    { label: 'Trust', href: '#trust' },
    { label: 'FAQ', href: '#faq' },
];

type MegaMenuLink = {
    label: string;
    detail: string;
    href: string;
    icon: IconType;
};

type MegaMenuGroup = {
    eyebrow: string;
    links: MegaMenuLink[];
};

const PRODUCT_MEGA_MENU_GROUPS: MegaMenuGroup[] = [
    {
        eyebrow: 'Campaign desk',
        links: [
            {
                label: 'Daily Campaign Desk',
                detail: 'One useful cue and the next manual campaign task.',
                href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.dailyCampaignDesk,
                icon: LuRadar,
            },
            {
                label: 'Campaign Pack Studio',
                detail: 'WhatsApp, Google, creative, print, and handoff.',
                href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.campaignPackStudio,
                icon: LuMessageSquare,
            },
            {
                label: 'Creative Studio',
                detail: 'Edit source-backed campaign assets.',
                href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeStudio,
                icon: LuPalette,
            },
            {
                label: 'CueLayers',
                detail: 'Reuse flat images with safe fallbacks.',
                href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.cueLayers,
                icon: LuLayers,
            },
            {
                label: 'Video Reel Studio',
                detail: 'Approved short videos rendered in the browser.',
                href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.videoReelStudio,
                icon: LuVideo,
            },
        ],
    },
    {
        eyebrow: 'Review and reuse',
        links: [
            {
                label: 'Trust Center',
                detail: 'Claim, source, risk, and action rows.',
                href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeTrustCenter,
                icon: LuShieldCheck,
            },
            {
                label: 'Brand and proof',
                detail: 'Brand Playbook guidance and proof deck.',
                href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.brandPlaybookProofDeck,
                icon: LuBadgeCheck,
            },
            {
                label: 'Reusable templates',
                detail: 'Repeat useful packs without starting over.',
                href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.reusablePackTemplates,
                icon: LuRefreshCcw,
            },
        ],
    },
];

const USE_CASE_MEGA_MENU_GROUPS: MegaMenuGroup[] = [
    {
        eyebrow: 'Owner journeys',
        links: [
            {
                label: 'Small business',
                detail: 'Full journey from facts to a usable pack.',
                href: CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness,
                icon: LuStore,
            },
            {
                label: 'Restaurants',
                detail: 'Menu offers, lunch pushes, counter notes.',
                href: CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness,
                icon: LuFileText,
            },
            {
                label: 'Salons',
                detail: 'Open slots, service pushes, booking reminders.',
                href: CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness,
                icon: LuSparkles,
            },
            {
                label: 'Retail and services',
                detail: 'New stock, availability, local service areas.',
                href: CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness,
                icon: LuMegaphone,
            },
        ],
    },
    {
        eyebrow: 'Team workflows',
        links: [
            {
                label: 'Agencies',
                detail: 'Proof decks and client-ready manual handoff.',
                href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.brandPlaybookProofDeck,
                icon: LuBadgeCheck,
            },
            {
                label: 'Multi-location',
                detail: 'Repeat useful packs with local facts refreshed.',
                href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.reusablePackTemplates,
                icon: LuRefreshCcw,
            },
            {
                label: 'Manual delivery',
                detail: 'Copy, download, assign, and record results.',
                href: '#delivery',
                icon: LuDownload,
            },
        ],
    },
];

const HERO_PILLS = [
    'Starts from real business facts',
    'Exports before it posts',
    'Risky claims stay visible',
];

const FIT_ITEMS = [
    "Today's cue",
    'Checked facts',
    'Copy or download',
    'Result memory',
];

const FLOW_MAP_STEPS: WorkflowStep[] = [
    {
        label: 'Facts',
        title: 'Business facts',
        detail: 'Offer, photo, price, link, slot, event, service area, or owner note enters the workspace.',
        icon: LuStore,
    },
    {
        label: 'Cue',
        title: 'Today cue',
        detail: 'CampaignCue picks one useful promotion job instead of asking the owner to start from a blank prompt.',
        icon: LuRadar,
    },
    {
        label: 'Pack',
        title: 'Campaign pack',
        detail: 'Copy, creative, print, video brief, staff note, and local update drafts stay together.',
        icon: LuWalletCards,
    },
    {
        label: 'Check',
        title: 'Visible review',
        detail: 'Source facts, claims, rights, approval, pack readiness, and avoid-list wording stay visible.',
        icon: LuShieldCheck,
    },
    {
        label: 'Export',
        title: 'Manual handoff',
        detail: 'The owner downloads, copies, assigns, posts outside CampaignCue, and records what happened.',
        icon: LuDownload,
    },
    {
        label: 'Memory',
        title: 'Result memory',
        detail: 'Used, skipped, booked, sold, and follow-up notes shape the next cue and can nominate safe reuse.',
        icon: LuBarChart3,
    },
];

const PACK_ROOM_COLUMNS: PackRoomColumn[] = [
    {
        title: 'Owner-ready pieces',
        description: 'The usable outputs sit together instead of becoming scattered files.',
        icon: LuFileDown,
        items: [
            { label: 'WhatsApp status', status: 'Copy ready' },
            { label: 'Google local draft', status: 'Manual publish' },
            { label: 'Square + story creative', status: 'Download PNG' },
            { label: 'Print and staff pack', status: 'Use in store' },
        ],
    },
    {
        title: 'Proof beside the work',
        description: 'Every pack carries the reason it is safe enough to use.',
        icon: LuClipboardCheck,
        items: [
            { label: 'Source trace', status: 'Price + link' },
            { label: 'Brand note', status: 'Playbook guided' },
            { label: 'Claim review', status: 'No ranking claim' },
            { label: 'Rights note', status: 'Owner review' },
        ],
    },
    {
        title: 'Manual delivery controls',
        description: 'Nothing silently posts, sends, publishes, or spends from the public promise.',
        icon: LuDownload,
        items: [
            { label: 'Download pack', status: 'Export first' },
            { label: 'Copy channel text', status: 'Owner action' },
            { label: 'Assign follow-up', status: 'Manual task' },
            { label: 'Mark result', status: 'Memory saved' },
        ],
    },
];

const POWERHOUSE_FEATURES: PowerhouseFeature[] = [
    {
        label: 'Generate',
        title: 'Campaign packs',
        description: 'Turn one local cue into WhatsApp, Google, social, print, reel, and staff handoff outputs.',
        icon: LuSparkles,
        tone: 'rose',
        artifacts: ['WhatsApp', 'Google draft', 'Poster'],
    },
    {
        label: 'Reuse',
        title: 'Existing images',
        description: 'Use generated assets or uploaded images as editable candidates through Creative Studio and CueLayers.',
        icon: LuLayers,
        tone: 'blue',
        artifacts: ['Source photo', 'Story crop', 'Counter card'],
    },
    {
        label: 'Local',
        title: 'Google and in-store',
        description: 'Prepare local update copy, counter cards, QR notes, and staff scripts from the same source.',
        icon: LuSearchCheck,
        tone: 'cream',
        artifacts: ['Local post', 'QR note', 'Staff line'],
    },
    {
        label: 'Video',
        title: 'Reel and local creator briefs',
        description: 'Use one public example to prepare original hooks, shot lists, creator-fit notes, and safe caption guidance without monitoring accounts or rendering spend.',
        icon: LuVideo,
        tone: 'pink',
        artifacts: ['Use an example', 'Local creator brief', 'Shot list'],
    },
    {
        label: 'Check',
        title: 'Creative trust',
        description: 'Keep price, proof, rights, consent, sensitive wording, and spend decisions visible before export.',
        icon: LuShieldCheck,
        tone: 'ink',
        artifacts: ['Price check', 'Rights note', 'No auto-post'],
    },
    {
        label: 'Learn',
        title: 'Result memory',
        description: 'Mark used, skipped, booked, sold, or follow-up so the next campaign starts with better context.',
        icon: LuBarChart3,
        tone: 'purple',
        artifacts: ['Used', 'Skipped', 'Follow-up'],
    },
];

const FEATURE_DOCK_ITEMS: FeatureDockItem[] = [
    {
        title: 'Daily Desk',
        detail: "Pick today's useful cue.",
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.dailyCampaignDesk,
        icon: LuLayoutDashboard,
        artifacts: ['Today cue', 'Missing input', 'Result memory'],
    },
    {
        title: 'Pack Studio',
        detail: 'Group every handoff.',
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.campaignPackStudio,
        icon: LuWalletCards,
        artifacts: ['WhatsApp', 'Google', 'Print'],
    },
    {
        title: 'Creative Studio',
        detail: 'Finish checked assets.',
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeStudio,
        icon: LuPalette,
        artifacts: ['Editor', 'Protected text', 'Export'],
    },
    {
        title: 'CueLayers',
        detail: 'Reuse flat images safely.',
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.cueLayers,
        icon: LuLayers,
        artifacts: ['Upload', 'Layer candidates', 'Fallback'],
    },
    {
        title: 'Video Studio',
        detail: 'Render checked short videos.',
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.videoReelStudio,
        icon: LuVideo,
        artifacts: ['Scenes', 'Captions', 'Download'],
    },
    {
        title: 'Trust Center',
        detail: 'See claim risk early.',
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeTrustCenter,
        icon: LuShieldCheck,
        artifacts: ['Claim', 'Source', 'Action'],
    },
    {
        title: 'Proof Deck',
        detail: 'Review before handoff.',
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.brandPlaybookProofDeck,
        icon: LuClipboardCheck,
        artifacts: ['Brand', 'Source trace', 'Notes'],
    },
    {
        title: 'Reusable Packs',
        detail: 'Refresh what worked.',
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.reusablePackTemplates,
        icon: LuRefreshCcw,
        artifacts: ['Save', 'Update facts', 'Export'],
    },
];

const TRUST_ROWS: TrustMatrixRow[] = [
    {
        claim: 'Lunch combo today 12-3 PM',
        source: 'Menu price + pickup link',
        risk: 'Clear',
        action: 'Export ready',
        tone: 'ok',
    },
    {
        claim: 'Best biryani in town',
        source: 'No ranking source',
        risk: 'Unsupported ranking',
        action: 'Blocked',
        tone: 'block',
    },
    {
        claim: 'Visible results after one facial',
        source: 'No approved before/after proof',
        risk: 'Result promise',
        action: 'Owner review',
        tone: 'warn',
    },
    {
        claim: 'I love this treatment',
        source: 'No consent or testimonial proof',
        risk: 'Fake experience',
        action: 'Rewrite brief',
        tone: 'warn',
    },
    {
        claim: 'Boost post with Rs 500',
        source: 'Spend not approved',
        risk: 'Paid action',
        action: 'Disabled',
        tone: 'block',
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
    {
        question: 'Do packs include a review record?',
        answer: 'Yes. Campaign packs can include a proof deck with brand direction, source trace, trust checks, UGC or reel references, and manual delivery notes so an owner, agency, or client can review before use.',
    },
    {
        question: 'Can CampaignCue reuse a campaign that worked before?',
        answer: 'Yes, after the owner records a useful result. CampaignCue rebuilds the same recipe from current checked facts and starts new trust, approval, and export state instead of copying the old pack.',
    },
];

const FOOTER_GROUPS: FooterGroup[] = [
    {
        title: 'Product',
        links: [
            { label: 'Daily Campaign Desk', href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.dailyCampaignDesk },
            { label: 'Campaign Studio', href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.campaignPackStudio },
            { label: 'Creative Studio', href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeStudio },
            { label: 'CueLayers', href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.cueLayers },
            { label: 'Video Reel Studio', href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.videoReelStudio },
        ],
    },
    {
        title: 'Workflows',
        links: [
            { label: 'Small business', href: CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness },
            { label: 'Restaurants', href: CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness },
            { label: 'Salons', href: CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness },
            { label: 'Retail and services', href: CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness },
        ],
    },
    {
        title: 'Trust',
        links: [
            { label: 'Trust Center', href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeTrustCenter },
            { label: 'Brand and proof', href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.brandPlaybookProofDeck },
            { label: 'Reusable templates', href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.reusablePackTemplates },
            { label: 'Export-first delivery', href: '#delivery' },
            { label: 'FAQ', href: '#faq' },
        ],
    },
    {
        title: 'Company',
        links: [
            { label: 'Open workspace', href: '/app' },
            { label: 'Product loop', href: '#pack-room' },
            { label: 'Owner outcomes', href: '#use-cases' },
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

async function getBasePath(): Promise<string> {
    try {
        const headerList = (await headers());
        const aliasBasePath = headerList.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

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
            <img src="/campaigncue-icon.svg" alt="" />
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

function CampaignCueProductProofFigure({
    image,
    className = '',
    eager = false,
}: {
    image: CampaignCueProofImage;
    className?: string;
    eager?: boolean;
}) {
    return (
        <figure className={`campaigncue-product-proof ${className}`}>
            <img src={image.src} alt={image.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />
            <figcaption>{image.caption}</figcaption>
        </figure>
    );
}

function HeroProductPreview() {
    return (
        <div className="campaigncue-hero-visual campaigncue-hero-visual--proof" aria-label="CampaignCue product preview">
            <div className="campaigncue-hero-cloud" aria-hidden="true">
                {HERO_FLOATING_ASSETS.map((asset, index) => (
                    <div
                        className={`campaigncue-floating-asset is-${index + 1} is-${asset.tone}`}
                        key={asset.title}
                    >
                        <span>{asset.eyebrow}</span>
                        <strong>{asset.title}</strong>
                        <em>{asset.detail}</em>
                    </div>
                ))}
            </div>
            <CampaignCueProductProofFigure
                image={CAMPAIGNCUE_PRODUCT_PROOF_IMAGES.hero}
                className="campaigncue-product-proof--hero"
                eager
            />
            <div className="campaigncue-hero-proof-artifacts" aria-label="CampaignCue sample campaign artifacts">
                {HERO_FLOATING_ASSETS.map((asset) => (
                    <div className={`campaigncue-floating-asset-rail-card campaigncue-hero-proof-artifact is-${asset.tone}`} key={asset.title}>
                        <span>{asset.eyebrow}</span>
                        <strong>{asset.title}</strong>
                        <em>{asset.detail}</em>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CampaignCueFlowMap() {
    return (
        <section className="campaigncue-flow-map" id="workflow" aria-label="CampaignCue workflow map">
            <div className="campaigncue-flow-map-heading">
                <span>Workflow map</span>
                <h2>One daily loop from fact to checked pack.</h2>
                <p>
                    CampaignCue is easiest to understand as a loop: source facts and the owner pulse come in, one safe cue is chosen,
                    the pack is prepared, current truth and commercial limits stay visible, and the result improves the next decision or safe reuse choice.
                </p>
            </div>
            <div className="campaigncue-flow-map-diagram">
                <div className="campaigncue-flow-map-center" aria-hidden="true">
                    <span>Today&apos;s cue</span>
                    <strong>Lunch combo before 2 PM</strong>
                    <p>WhatsApp, Google, story, poster, staff note, and proof are in one pack.</p>
                    <em>Source checked</em>
                </div>
                <ol className="campaigncue-flow-map-steps">
                    {FLOW_MAP_STEPS.map((step) => {
                        const Icon = step.icon;
                        return (
                            <li className="campaigncue-flow-map-node" key={step.title}>
                                <span>{step.label}</span>
                                <div aria-hidden="true">
                                    <Icon />
                                </div>
                                <strong>{step.title}</strong>
                                <p>{step.detail}</p>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}

function CampaignPackRoom() {
    return (
        <section className="campaigncue-pack-room" id="pack-room" aria-label="Campaign Pack Room preview">
            <div className="campaigncue-pack-room-copy">
                <span>Campaign Pack Room</span>
                <h2>One place for the pack, proof, and manual handoff.</h2>
                <p>
                    The owner should not hunt across files, prompts, chats, and dashboards. One pack room
                    shows the work, the source and freshness checks, owner-managed destinations, staff handoff, and the next manual action before anything leaves CampaignCue.
                </p>
            </div>
            <CampaignCueProductProofFigure
                image={CAMPAIGNCUE_PRODUCT_PROOF_IMAGES.packRoom}
                className="campaigncue-product-proof--pack-room"
            />
            <div className="campaigncue-pack-room-surface">
                <div className="campaigncue-pack-room-header">
                    <div>
                        <span>Lunch combo pack</span>
                        <strong>Ready after fact check</strong>
                    </div>
                    <em>Export first</em>
                </div>
                <div className="campaigncue-pack-room-columns">
                    {PACK_ROOM_COLUMNS.map((column) => {
                        const Icon = column.icon;
                        return (
                            <article key={column.title}>
                                <div className="campaigncue-pack-room-column-head">
                                    <span aria-hidden="true">
                                        <Icon />
                                    </span>
                                    <div>
                                        <strong>{column.title}</strong>
                                        <p>{column.description}</p>
                                    </div>
                                </div>
                                <div className="campaigncue-pack-room-list">
                                    {column.items.map((item) => (
                                        <div key={`${column.title}-${item.label}`}>
                                            <span>{item.label}</span>
                                            <em>{item.status}</em>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function CreativePowerhouse() {
    return (
        <section className="campaigncue-powerhouse" id="powerhouse" aria-label="CampaignCue creative powerhouse">
            <div className="campaigncue-powerhouse-heading">
                <span>Creative output system</span>
                <h2>Your local campaign powerhouse.</h2>
                <p>
                    CampaignCue should feel like work is being produced. Each source-backed cue becomes channel
                    assets, reuse paths, review checks, and export files the owner can actually use.
                </p>
            </div>
            <CampaignCueProductProofFigure
                image={CAMPAIGNCUE_PRODUCT_PROOF_IMAGES.creativeSystem}
                className="campaigncue-product-proof--creative-system"
            />
            <div className="campaigncue-powerhouse-grid">
                {POWERHOUSE_FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    return (
                        <article className={`campaigncue-powerhouse-card is-${feature.tone}`} key={feature.title}>
                            <div className="campaigncue-powerhouse-card-top">
                                <span>{feature.label}</span>
                                <Icon aria-hidden="true" />
                            </div>
                            <div className="campaigncue-powerhouse-visual" aria-hidden="true">
                                {feature.artifacts.map((artifact) => (
                                    <span key={artifact}>
                                        <small>{artifact}</small>
                                    </span>
                                ))}
                            </div>
                            <strong>{feature.title}</strong>
                            <p>{feature.description}</p>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

function FeatureDock({ basePath }: { basePath: string }) {
    return (
        <section className="campaigncue-home-feature-dock" id="features" aria-label="CampaignCue product surfaces">
            <div className="campaigncue-home-feature-dock-copy">
                <span>Product surfaces</span>
                <h2>Explore the parts behind the daily pack.</h2>
                <p>
                    The homepage stays light, but the important workflows stay visible and one tap away.
                </p>
            </div>
            <div className="campaigncue-home-feature-dock-grid">
                {FEATURE_DOCK_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <a
                            className="campaigncue-home-feature-dock-card"
                            href={withBasePath(basePath, item.href)}
                            key={item.title}
                        >
                            <span className="campaigncue-home-feature-dock-icon" aria-hidden="true">
                                <Icon />
                            </span>
                            <strong>{item.title}</strong>
                            <p>{item.detail}</p>
                            <div aria-hidden="true">
                                {item.artifacts.map((artifact) => (
                                    <em key={artifact}>{artifact}</em>
                                ))}
                            </div>
                        </a>
                    );
                })}
            </div>
        </section>
    );
}

function SmallBusinessUseCaseLink({ basePath }: { basePath: string }) {
    return (
        <a
            className="campaigncue-small-business-link"
            href={withBasePath(basePath, CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness)}
        >
            <span>For local businesses</span>
            <strong>See the small-business journey</strong>
            <p>
                A focused page shows how restaurants, salons, retail shops, clinics, fitness studios,
                and local services go from source facts to usable campaign packs.
            </p>
            <LuArrowRight aria-hidden="true" />
        </a>
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
            <div className="campaigncue-trust-table-heading" aria-hidden="true">
                <span>Claim</span>
                <span>Source</span>
                <span>Risk</span>
                <span>Action</span>
            </div>
            {TRUST_ROWS.map((row) => (
                <div className="campaigncue-trust-row" data-tone={row.tone} key={row.claim}>
                    <strong>{row.claim}</strong>
                    <span>{row.source}</span>
                    <span>{row.risk}</span>
                    <em>{row.action}</em>
                </div>
            ))}
        </div>
    );
}

type CampaignCueMegaMenuProps = {
    basePath: string;
    label: string;
    ariaLabel: string;
    overviewHref: string;
    overviewTitle: string;
    overviewDetail: string;
    groups: MegaMenuGroup[];
    storyEyebrow: string;
    storyTitle: string;
    storyDetail: string;
    storyStat: string;
    storyNote: string;
};

function CampaignCueMegaMenu({
    basePath,
    label,
    ariaLabel,
    overviewHref,
    overviewTitle,
    overviewDetail,
    groups,
    storyEyebrow,
    storyTitle,
    storyDetail,
    storyStat,
    storyNote,
}: CampaignCueMegaMenuProps) {
    return (
        <div className="campaigncue-mega-menu">
            <button
                type="button"
                className="campaigncue-mega-menu-trigger"
                aria-haspopup="true"
                aria-label={ariaLabel}
            >
                {label}
                <LuChevronDown aria-hidden="true" />
            </button>
            <div className="campaigncue-mega-menu-panel" role="menu" aria-label={ariaLabel}>
                <a className="campaigncue-mega-menu-overview" href={withBasePath(basePath, overviewHref)} role="menuitem">
                    <span>
                        <LuLayoutDashboard aria-hidden="true" />
                    </span>
                    <div>
                        <strong>{overviewTitle}</strong>
                        <small>{overviewDetail}</small>
                    </div>
                    <LuArrowRight aria-hidden="true" />
                </a>
                <div className="campaigncue-mega-menu-body">
                    <div className="campaigncue-mega-menu-groups">
                        {groups.map((group) => (
                            <section key={group.eyebrow} aria-label={group.eyebrow}>
                                <p>{group.eyebrow}</p>
                                <div>
                                    {group.links.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <a
                                                className="campaigncue-mega-menu-item"
                                                href={withBasePath(basePath, item.href)}
                                                key={item.label}
                                                role="menuitem"
                                            >
                                                <span className="campaigncue-mega-menu-icon" aria-hidden="true">
                                                    <Icon />
                                                </span>
                                                <span>
                                                    <strong>{item.label}</strong>
                                                    <small>{item.detail}</small>
                                                </span>
                                            </a>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                    <aside className="campaigncue-mega-menu-story" aria-label="CampaignCue workflow preview">
                        <span>{storyEyebrow}</span>
                        <h2>{storyTitle}</h2>
                        <p>{storyDetail}</p>
                        <div>
                            <strong>{storyStat}</strong>
                            <small>{storyNote}</small>
                        </div>
                    </aside>
                </div>
            </div>
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

export default async function CampaignCueHomePage() {
    const basePath = await getBasePath();

    return (
        <main className="campaigncue-site">
            <div className="campaigncue-page-mesh" aria-hidden="true" />
            <div className="campaigncue-page-grain" aria-hidden="true" />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(JSON_LD) }}
            />
            <header className="campaigncue-nav">
                <a className="campaigncue-brand" href={withBasePath(basePath, '/')}>
                    <BrandMark />
                    <strong>CampaignCue</strong>
                </a>
                <nav aria-label="CampaignCue website sections">
                    <CampaignCueMegaMenu
                        basePath={basePath}
                        label="Product"
                        ariaLabel="CampaignCue product pages"
                        overviewHref="#pack-room"
                        overviewTitle="Product overview"
                        overviewDetail="See the complete CampaignCue workflow from cue to checked export."
                        groups={PRODUCT_MEGA_MENU_GROUPS}
                        storyEyebrow="Product loop"
                        storyTitle="One cue becomes a checked campaign pack."
                        storyDetail="Source facts, creative files, review notes, and manual export stay together before anything leaves the workspace."
                        storyStat="Export first"
                        storyNote="No direct account posting in the active delivery mode."
                    />
                    <CampaignCueMegaMenu
                        basePath={basePath}
                        label="Use cases"
                        ariaLabel="CampaignCue use-case pages"
                        overviewHref={CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness}
                        overviewTitle="Small-business journey"
                        overviewDetail="See how local owners go from business facts to a usable pack."
                        groups={USE_CASE_MEGA_MENU_GROUPS}
                        storyEyebrow="Owner fit"
                        storyTitle="Pick the business type, then show the useful pack."
                        storyDetail="Restaurants, salons, retail shops, services, agencies, and multi-location teams all start from facts instead of a blank prompt."
                        storyStat="Manual handoff"
                        storyNote="Copy, download, review, and post outside CampaignCue."
                    />
                    {NAV_LINKS.map((link) => (
                        <a href={withBasePath(basePath, link.href)} key={link.label}>
                            {link.label}
                        </a>
                    ))}
                </nav>
                <a className="campaigncue-nav-action" href={withBasePath(basePath, '/app')}>
                    App
                    <LuArrowRight aria-hidden="true" />
                </a>
                <CampaignCueMobileNavigation basePath={basePath} />
            </header>

            <section className="campaigncue-hero">
                <div className="campaigncue-hero-copy">
                    <span className="campaigncue-eyebrow">Daily campaign desk for local businesses</span>
                    <h1>CampaignCue</h1>
                    <p>
                        Know what is safe and useful to promote today. Get the checked pack, staff handoff, and owner-controlled files ready to use.
                    </p>
                    <div className="campaigncue-actions">
                        <a className="campaigncue-primary-action" href={withBasePath(basePath, '/app')}>
                            Open workspace
                            <LuArrowRight aria-hidden="true" />
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

            <CampaignCueFlowMap />

            <CampaignPackRoom />

            <CreativePowerhouse />

            <FeatureDock basePath={basePath} />

            <section className="campaigncue-section campaigncue-split" id="trust">
                <div>
                    <SectionIntro eyebrow="Trust and safety" title="Risky work stays visible before use.">
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
                    <span>Delivery boundary</span>
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
                <SectionIntro eyebrow="Use cases" title="Start with the business type.">
                    Restaurants, salons, retail shops, agencies, and multi-location teams all need the same simple
                    loop: current facts in, checked campaign pack out.
                </SectionIntro>
                <SmallBusinessUseCaseLink basePath={basePath} />
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
                <CampaignCueAiSummary />
                <div className="campaigncue-footer-bottom">
                    <span>© 2026 CampaignCue</span>
                    <span>Export-first delivery. Direct account posting is outside the active delivery mode.</span>
                </div>
            </footer>
        </main>
    );
}
