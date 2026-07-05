export const CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS = {
    smallBusiness: "/use-cases/small-business",
} as const;

export type CampaignCueWebsiteUseCaseStep = {
    label: string;
    title: string;
    detail: string;
};

export type CampaignCueWebsiteUseCaseAsset = {
    label: string;
    title: string;
    note: string;
    tone: "rose" | "pink" | "blue" | "cream" | "purple" | "ink";
};

export type CampaignCueWebsiteUseCaseScenario = {
    businessType: string;
    source: string;
    output: string;
    review: string;
};

export type CampaignCueWebsiteUseCase = {
    slug: string;
    path: string;
    title: string;
    eyebrow: string;
    heroTitle: string;
    description: string;
    metaDescription: string;
    ownerQuestions: Array<{
        question: string;
        answer: string;
        proof: string;
    }>;
    steps: CampaignCueWebsiteUseCaseStep[];
    assets: CampaignCueWebsiteUseCaseAsset[];
    scenarios: CampaignCueWebsiteUseCaseScenario[];
    boundaries: string[];
    faq: Array<{
        question: string;
        answer: string;
    }>;
};

export const CAMPAIGNCUE_SMALL_BUSINESS_USE_CASE: CampaignCueWebsiteUseCase = {
    slug: "small-business",
    path: CAMPAIGNCUE_WEBSITE_USE_CASE_PATHS.smallBusiness,
    title: "Small Business Campaign Packs",
    eyebrow: "For local businesses",
    heroTitle: "Turn today's business facts into a campaign pack owners can use.",
    description:
        "For restaurants, salons, retail shops, clinics, fitness studios, and local services that need WhatsApp text, Google updates, creative files, print notes, and review checks without connecting social accounts.",
    metaDescription:
        "See how CampaignCue helps small businesses turn real business facts into source-checked WhatsApp, Google, creative, print, and manual handoff packs.",
    ownerQuestions: [
        {
            question: "What should I promote today?",
            answer: "CampaignCue starts with current offers, services, photos, hours, links, and owner notes, then shows one practical cue.",
            proof: "Today cue",
        },
        {
            question: "Is the pack safe to use?",
            answer: "Prices, public links, photo rights, consent, search-position claims, spend, and sensitive copy stay visible before export.",
            proof: "Review visible",
        },
        {
            question: "Can I reuse an old image?",
            answer: "CueLayers keeps the original safe and turns reliable parts into editable candidates when the image supports it.",
            proof: "Flat fallback",
        },
        {
            question: "What do I leave with?",
            answer: "The owner gets copy, files, briefs, print notes, and manual delivery steps that can be copied or downloaded.",
            proof: "Export first",
        },
    ],
    steps: [
        {
            label: "Gather",
            title: "Use the facts already available",
            detail: "Business details, menu or service items, offers, photos, booking links, and owner notes become the source base.",
        },
        {
            label: "Choose",
            title: "Pick one useful cue",
            detail: "The page opens around a practical action such as a lunch push, slot fill, weekend offer, local update, or asset reuse.",
        },
        {
            label: "Prepare",
            title: "Prepare the pack",
            detail: "One cue becomes WhatsApp text, Google fields, social creative, print notes, staff copy, and video or UGC briefs.",
        },
        {
            label: "Review",
            title: "Check before use",
            detail: "CampaignCue shows source, missing facts, blocked claims, spend gates, and manual delivery notes before the owner exports.",
        },
        {
            label: "Export",
            title: "Export and remember",
            detail: "The owner downloads files, copies text, posts manually, and marks what happened so the next cue starts better.",
        },
    ],
    assets: [
        {
            label: "WhatsApp",
            title: "Status text",
            note: "Copy ready",
            tone: "rose",
        },
        {
            label: "Google",
            title: "Local update",
            note: "Source checked",
            tone: "blue",
        },
        {
            label: "Story",
            title: "Offer creative",
            note: "Editable",
            tone: "pink",
        },
        {
            label: "Print",
            title: "Counter note",
            note: "Use in store",
            tone: "cream",
        },
        {
            label: "Video",
            title: "Reel brief",
            note: "Shoot ready",
            tone: "purple",
        },
        {
            label: "Trust",
            title: "Claim review",
            note: "Owner check",
            tone: "ink",
        },
    ],
    scenarios: [
        {
            businessType: "Restaurant",
            source: "Lunch combo, price, pickup link, and food photo",
            output: "WhatsApp status, Google update, story creative, table card, and staff line",
            review: "Price and public link checked",
        },
        {
            businessType: "Salon",
            source: "Open 4 PM slot, service name, booking link, and approved photo",
            output: "Story post, WhatsApp line, booking reminder, and before/after claim review",
            review: "Booking link ready",
        },
        {
            businessType: "Retail shop",
            source: "New stock, weekend offer, store hours, and product image",
            output: "Poster, shelf note, Google update, story creative, and QR brief",
            review: "Offer date visible",
        },
        {
            businessType: "Clinic",
            source: "Appointment reminder, service category, phone CTA, and cautious wording",
            output: "Reminder copy, poster note, staff handoff, and review checklist",
            review: "Sensitive claim guarded",
        },
        {
            businessType: "Fitness studio",
            source: "Trial class, session time, coach note, and member referral offer",
            output: "Class-fill post, WhatsApp copy, story sequence, and counter script",
            review: "Timing checked",
        },
        {
            businessType: "Local service",
            source: "Service area, availability, proof note, and phone CTA",
            output: "Google update, flyer note, ad handoff copy, and manual follow-up task",
            review: "No unsupported promise",
        },
    ],
    boundaries: [
        "No automatic posting to Instagram, Facebook, Google, or WhatsApp in the active delivery mode.",
        "No promise that one campaign will guarantee sales or search position.",
        "No social account connection, ad spend change, or hidden provider requirement.",
        "No promise to perfectly rebuild every uploaded image when the source is too flat or unclear.",
    ],
    faq: [
        {
            question: "Is this only for restaurants?",
            answer: "No. Restaurants are one good example, but the workflow also fits salons, retail shops, clinics, fitness studios, local services, agencies, and multi-location businesses.",
        },
        {
            question: "Does CampaignCue post for the owner?",
            answer: "No. The current product prepares copy, files, briefs, review notes, and manual delivery tasks. The owner or agency posts outside CampaignCue.",
        },
        {
            question: "Can an owner start from a phone photo?",
            answer: "Yes. A phone photo can be stored as a source or reused through Creative Studio and CueLayers, with the original preserved and uncertain layer work flagged.",
        },
        {
            question: "What makes this different from a template site?",
            answer: "CampaignCue starts from the business facts and current opportunity. Templates and editor tools help finish the pack, but source checks stay attached.",
        },
    ],
};

export const CAMPAIGNCUE_WEBSITE_USE_CASES = [
    CAMPAIGNCUE_SMALL_BUSINESS_USE_CASE,
] as const;
