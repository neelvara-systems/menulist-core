import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { IconType } from 'react-icons';
import { CAMPAIGNCUE_WEBSITE_FEATURE_PATHS } from '@constant/campaigncue/websiteFeatures';
import { CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS } from '@constant/campaigncue/websiteUseCases';
import {
    LuArrowRight,
    LuBadgeCheck,
    LuBarChart3,
    LuBrain,
    LuBrush,
    LuCalendarClock,
    LuCheckCircle2,
    LuChevronDown,
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
    href?: string;
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

type FitCheckItem = {
    challenge: string;
    response: string;
    proof: string;
    icon: IconType;
};

type HeroAsset = {
    label: string;
    title: string;
    meta: string;
    tone: string;
};

type PowerhouseFeature = {
    label: string;
    title: string;
    description: string;
    icon: IconType;
    tone: string;
};

type CampaignWallAsset = {
    label: string;
    title: string;
    note: string;
    tone: string;
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

type ProofDeckPreviewRow = {
    label: string;
    detail: string;
    status: string;
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

const NAV_LINKS = [
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
                detail: 'One useful cue from current facts.',
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
                href: '#starts',
                icon: LuFileText,
            },
            {
                label: 'Salons',
                detail: 'Open slots, service pushes, booking reminders.',
                href: '#starts',
                icon: LuSparkles,
            },
            {
                label: 'Retail and services',
                detail: 'New stock, availability, local service areas.',
                href: '#starts',
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
                href: '#proof-system',
                icon: LuBadgeCheck,
            },
            {
                label: 'Multi-location',
                detail: 'Repeat useful packs with local facts refreshed.',
                href: '#proof-system',
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
    'WhatsApp + Google',
    'Creative + print',
    'Manual handoff',
    'Result memory',
];

const FIT_CHECK_ITEMS: FitCheckItem[] = [
    {
        challenge: 'I need something useful to promote today.',
        response: 'CampaignCue starts with one current cue from offers, services, photos, hours, and owner notes.',
        proof: 'Today cue',
        icon: LuRadar,
    },
    {
        challenge: 'I have the facts, but no ready channel pack.',
        response: 'One source-backed pack covers WhatsApp, Google, social creative, print, video brief, and staff handoff.',
        proof: 'Pack ready',
        icon: LuWorkflow,
    },
    {
        challenge: 'I worry the copy may say the wrong thing.',
        response: 'Prices, links, photo rights, consent, sensitive claims, ranking claims, and spend are checked before use.',
        proof: 'Review visible',
        icon: LuShieldCheck,
    },
    {
        challenge: 'I want files and text, not connected posting.',
        response: 'Day one stays export-first: download assets, copy text, schedule manual work, and mark what happened.',
        proof: 'No direct post',
        icon: LuDownload,
    },
];

const HERO_FLOATING_ASSETS: HeroAsset[] = [
    {
        label: 'Story',
        title: 'Lunch combo',
        meta: '1080 x 1920',
        tone: 'rose',
    },
    {
        label: 'Poster',
        title: 'Book today',
        meta: 'Print ready',
        tone: 'pink',
    },
    {
        label: 'Google',
        title: 'Local update',
        meta: 'Source checked',
        tone: 'blue',
    },
    {
        label: 'Script',
        title: '15 sec reel',
        meta: 'Shoot list',
        tone: 'purple',
    },
    {
        label: 'Trust',
        title: 'Claim review',
        meta: 'Owner check',
        tone: 'cream',
    },
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
        group: 'Pack',
        title: 'Reusable templates',
        detail: 'Platform and saved workspace templates keep recurring restaurant, salon, retail, agency, and location campaigns consistent.',
        tag: 'Template',
        icon: LuWalletCards,
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
        title: 'Brand Playbook',
        detail: 'Brand feel, visual motifs, product focus, and avoid-list wording guide the pack without replacing campaign proof.',
        tag: 'Brand guide',
        icon: LuPalette,
    },
    {
        group: 'Review',
        title: 'Proof deck',
        detail: 'Brand direction, source trace, UGC/reel reference, review checklist, and delivery boundary travel with the pack.',
        tag: 'Review brief',
        icon: LuClipboardCheck,
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
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.dailyCampaignDesk,
    },
    {
        title: 'Saved business facts',
        description: 'Menus, services, brand details, local context, links, and proof stay attached to campaign packs.',
        icon: LuBrain,
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.brandPlaybookProofDeck,
    },
    {
        title: 'Campaign Studio',
        description: 'One local opportunity turns into WhatsApp, Google, social, video, and ad handoff outputs.',
        icon: LuWorkflow,
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.campaignPackStudio,
    },
    {
        title: 'Creative Studio',
        description: 'Editable designs, Design Cue commands, resize presets, and export checks stay in one editor.',
        icon: LuPalette,
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeStudio,
    },
    {
        title: 'CueLayers',
        description: 'Uploaded or generated flat images can become editable layer candidates with safe fallbacks and review flags.',
        icon: LuLayers,
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.cueLayers,
    },
    {
        title: 'Creative Trust Center',
        description: 'Every risky claim, missing proof, stale detail, or spend action is visible before the owner uses the pack.',
        icon: LuClipboardCheck,
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeTrustCenter,
    },
];

const PROOF_SYSTEM_CAPABILITIES: IconCard[] = [
    {
        title: 'Brand Playbook',
        description: 'Brand feel, visual motifs, product focus, and avoid-list wording guide the pack while campaign facts stay separate.',
        icon: LuPalette,
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.brandPlaybookProofDeck,
    },
    {
        title: 'Campaign proof deck',
        description: 'Brand snapshot, source trace, trust checklist, UGC/reel references, and manual delivery notes stay together for review.',
        icon: LuClipboardCheck,
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.brandPlaybookProofDeck,
    },
    {
        title: 'Reusable pack templates',
        description: 'Approved packs can become repeatable starting points for recurring restaurant, salon, retail, agency, and location work.',
        icon: LuWalletCards,
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.reusablePackTemplates,
    },
    {
        title: 'Disclosure and avoid-list checks',
        description: 'UGC and video briefs surface consent, fake testimonial risk, disclosure language, and blocked wording before handoff.',
        icon: LuShieldAlert,
        href: CAMPAIGNCUE_WEBSITE_FEATURE_PATHS.creativeTrustCenter,
    },
];

const PROOF_DECK_PREVIEW_ROWS: ProofDeckPreviewRow[] = [
    {
        label: 'Source trace',
        detail: 'Menu price, owner note, booking link, and asset rights stay attached.',
        status: 'Checked',
    },
    {
        label: 'Brand direction',
        detail: 'Brand feel, visual motifs, product focus, and avoid-list wording are visible.',
        status: 'Guided',
    },
    {
        label: 'Review checklist',
        detail: 'Claims, consent, disclosure, spend, and manual delivery are reviewed before export.',
        status: 'Owner review',
    },
];

const TEMPLATE_REUSE_STEPS: WorkflowStep[] = [
    {
        label: '01',
        title: 'Save the useful pack',
        detail: 'A proven lunch, slot-fill, event, or approval pack becomes a reusable base for the workspace.',
        icon: LuWalletCards,
    },
    {
        label: '02',
        title: 'Update the facts',
        detail: 'Change price, date, product, photo, location, or CTA while the source checks stay visible.',
        icon: LuRefreshCcw,
    },
    {
        label: '03',
        title: 'Export again',
        detail: 'Download the refreshed pack, send for approval, or mark manual use without connecting accounts.',
        icon: LuDownload,
    },
];

const POWERHOUSE_FEATURES: PowerhouseFeature[] = [
    {
        label: 'Generate',
        title: 'Campaign packs',
        description: 'Turn one local cue into WhatsApp, Google, social, print, reel, and staff handoff outputs.',
        icon: LuSparkles,
        tone: 'rose',
    },
    {
        label: 'Reuse',
        title: 'Existing images',
        description: 'Use generated assets or uploaded images as editable candidates through Creative Studio and CueLayers.',
        icon: LuLayers,
        tone: 'blue',
    },
    {
        label: 'Local',
        title: 'Google and in-store',
        description: 'Prepare local update copy, counter cards, QR notes, and staff scripts from the same source.',
        icon: LuSearchCheck,
        tone: 'cream',
    },
    {
        label: 'Video',
        title: 'Reel and UGC briefs',
        description: 'Create hooks, shot lists, creator instructions, and safe caption notes without rendering spend.',
        icon: LuVideo,
        tone: 'pink',
    },
    {
        label: 'Check',
        title: 'Creative trust',
        description: 'Keep price, proof, rights, consent, sensitive wording, and spend decisions visible before export.',
        icon: LuShieldCheck,
        tone: 'ink',
    },
    {
        label: 'Learn',
        title: 'Result memory',
        description: 'Mark used, skipped, booked, sold, or follow-up so the next campaign starts with better context.',
        icon: LuBarChart3,
        tone: 'purple',
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

const CAMPAIGN_WALL_ASSETS: CampaignWallAsset[] = [
    {
        label: 'WhatsApp',
        title: 'Lunch combo status',
        note: 'Price checked',
        tone: 'rose',
    },
    {
        label: 'Story',
        title: 'Salon slot fill',
        note: 'Booking link ready',
        tone: 'pink',
    },
    {
        label: 'Poster',
        title: 'Weekend retail offer',
        note: 'Print handoff',
        tone: 'blue',
    },
    {
        label: 'Google',
        title: 'Local update draft',
        note: 'Manual publish',
        tone: 'cream',
    },
    {
        label: 'Reel',
        title: '15 second shot list',
        note: 'Staff script',
        tone: 'purple',
    },
    {
        label: 'QR',
        title: 'Table card brief',
        note: 'Offer page',
        tone: 'ink',
    },
    {
        label: 'UGC',
        title: 'Creator prompt',
        note: 'No fake result claim',
        tone: 'blush',
    },
    {
        label: 'Ad',
        title: 'Spend-gated copy',
        note: 'Approval required',
        tone: 'mint',
    },
    {
        label: 'Clinic',
        title: 'Reminder copy',
        note: 'Cautious wording',
        tone: 'white',
    },
    {
        label: 'Agency',
        title: 'Client approval note',
        note: 'Source linked',
        tone: 'peach',
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
    {
        question: 'Do packs include a review record?',
        answer: 'Yes. Campaign packs can include a proof deck with brand direction, source trace, trust checks, UGC or reel references, and manual delivery notes so an owner, agency, or client can review before use.',
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
        ],
    },
    {
        title: 'Workflows',
        links: [
            { label: 'Small business', href: CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness },
            { label: 'Restaurants', href: '#starts' },
            { label: 'Salons', href: '#starts' },
            { label: 'Retail and services', href: '#starts' },
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
            <div className="campaigncue-hero-cloud" aria-hidden="true">
                {HERO_FLOATING_ASSETS.map((asset, index) => (
                    <div className={`campaigncue-floating-asset is-${asset.tone} is-${index + 1}`} key={asset.title}>
                        <span>{asset.label}</span>
                        <strong>{asset.title}</strong>
                        <em>{asset.meta}</em>
                    </div>
                ))}
            </div>
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

function CampaignCueFitCheck() {
    return (
        <section className="campaigncue-fit-check" id="fit-check" aria-label="CampaignCue quick fit check">
            <div className="campaigncue-fit-check-copy">
                <span>Quick fit check</span>
                <h2>Pick the problem you recognize.</h2>
                <p>
                    Campaign tools usually start with a blank generator. CampaignCue starts with the owner&apos;s
                    daily bottleneck and turns it into a checked campaign pack.
                </p>
            </div>
            <div className="campaigncue-fit-check-list">
                {FIT_CHECK_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div className="campaigncue-fit-check-row" key={item.challenge}>
                            <Icon aria-hidden="true" />
                            <div>
                                <strong>{item.challenge}</strong>
                                <p>{item.response}</p>
                            </div>
                            <span>{item.proof}</span>
                        </div>
                    );
                })}
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
                                <span />
                                <span />
                                <span />
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

function CapabilityLedger({ cards, basePath = '' }: { cards: IconCard[]; basePath?: string }) {
    return (
        <div className="campaigncue-capability-ledger">
            {cards.map((card) => {
                const Icon = card.icon;
                const children = (
                    <>
                        <span aria-hidden="true">
                            <Icon />
                        </span>
                        <div>
                            <strong>{card.title}</strong>
                            <p>{card.description}</p>
                        </div>
                    </>
                );

                return card.href ? (
                    <a className="campaigncue-capability-row" href={withBasePath(basePath, card.href)} key={card.title}>
                        {children}
                        <LuArrowRight aria-hidden="true" />
                    </a>
                ) : (
                    <div className="campaigncue-capability-row" key={card.title}>
                        {children}
                    </div>
                );
            })}
        </div>
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

function CampaignAssetWall() {
    return (
        <section className="campaigncue-asset-wall" aria-label="CampaignCue generated asset examples">
            <div className="campaigncue-asset-wall-copy">
                <span>Generated campaign handoff</span>
                <h2>It should look like finished work, not another prompt page.</h2>
                <p>
                    These are example campaign artifacts CampaignCue prepares from the same source-backed cue.
                    Owners still review, export, and post manually.
                </p>
            </div>
            <div className="campaigncue-asset-wall-grid">
                {CAMPAIGN_WALL_ASSETS.map((asset) => (
                    <div className={`campaigncue-asset-tile is-${asset.tone}`} key={asset.title}>
                        <span>{asset.label}</span>
                        <strong>{asset.title}</strong>
                        <em>{asset.note}</em>
                    </div>
                ))}
            </div>
        </section>
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

function ProofDeckPreview() {
    return (
        <div className="campaigncue-proof-deck-preview" aria-label="Campaign proof deck preview">
            <div className="campaigncue-proof-deck-top">
                <span>Campaign proof deck</span>
                <strong>Ready for review</strong>
            </div>
            <div className="campaigncue-proof-deck-hero">
                <span>Review brief</span>
                <h3>Lunch combo campaign</h3>
                <p>Source-backed pack for WhatsApp, Google, poster, staff note, and manual handoff.</p>
            </div>
            <div className="campaigncue-proof-deck-list">
                {PROOF_DECK_PREVIEW_ROWS.map((row) => (
                    <div className="campaigncue-proof-deck-row" key={row.label}>
                        <div>
                            <strong>{row.label}</strong>
                            <p>{row.detail}</p>
                        </div>
                        <span>{row.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TemplateReuseFlow() {
    return (
        <div className="campaigncue-template-flow" aria-label="Reusable pack template flow">
            <div className="campaigncue-template-flow-heading">
                <span>Reusable template loop</span>
                <strong>Do not start over when a pack already works.</strong>
            </div>
            <ol>
                {TEMPLATE_REUSE_STEPS.map((step) => {
                    const Icon = step.icon;
                    return (
                        <li key={step.title}>
                            <span>{step.label}</span>
                            <Icon aria-hidden="true" />
                            <div>
                                <strong>{step.title}</strong>
                                <p>{step.detail}</p>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

function CampaignCueProofSystem({ basePath }: { basePath: string }) {
    return (
        <section className="campaigncue-section campaigncue-proof-system" id="proof-system">
            <div className="campaigncue-proof-system-copy">
                <SectionIntro eyebrow="Brand And Proof" title="The pack keeps the reason it is safe to use.">
                    CampaignCue does not only prepare artwork and copy. It keeps brand guidance, reusable pack
                    structure, proof notes, disclosure checks, and delivery boundaries visible before anything is exported.
                </SectionIntro>
                <div className="campaigncue-inline-checks">
                    <span>
                        <LuPalette aria-hidden="true" />
                        Brand guided
                    </span>
                    <span>
                        <LuClipboardCheck aria-hidden="true" />
                        Proof deck
                    </span>
                    <span>
                        <LuShieldCheck aria-hidden="true" />
                        Review ready
                    </span>
                </div>
                <CapabilityLedger cards={PROOF_SYSTEM_CAPABILITIES} basePath={basePath} />
            </div>
            <ProofDeckPreview />
            <TemplateReuseFlow />
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
                                                <Icon aria-hidden="true" />
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
                    <CampaignCueMegaMenu
                        basePath={basePath}
                        label="Product"
                        ariaLabel="CampaignCue product pages"
                        overviewHref="#catalog"
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

            <CampaignCueFitCheck />

            <CreativePowerhouse />

            <RealWorkProof />

            <CampaignCueCatalog />

            <OwnerDayPath />

            <CampaignCueProofSystem basePath={basePath} />

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

            <CampaignAssetWall />

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
                <SmallBusinessUseCaseLink basePath={basePath} />
                <CapabilityLedger cards={PRODUCT_CAPABILITIES} basePath={basePath} />
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
