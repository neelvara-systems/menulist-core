export type WebsiteIndustryPage = {
    audience: string;
    canonicalPath: string;
    ctaLabel: string;
    ctaPath: string;
    description: string;
    eyebrow: string;
    faq: Array<{
        answer: string;
        question: string;
    }>;
    fit: string[];
    highlight: string;
    metaDescription: string;
    metaTitle: string;
    proof: string[];
    resourceLinks: Array<{
        href: string;
        label: string;
    }>;
    secondaryCtaLabel: string;
    secondaryCtaPath: string;
    slug: string;
    title: string;
};

export const websiteIndustryPages: WebsiteIndustryPage[] = [
    {
        slug: 'restaurants',
        canonicalPath: '/industries/restaurants',
        metaTitle: 'Official Menu Source for Restaurants | MenuList',
        metaDescription: 'Keep one approved restaurant menu current across QR codes, Google links, WhatsApp, website links, print assets, screens, and customer-facing pages.',
        eyebrow: 'For restaurants',
        title: 'Official menu source for the menu customers actually see.',
        highlight: 'Official menu source',
        description: 'Restaurants lose trust when QR codes, Google links, PDFs, social profiles, branch pages, screens, and staff replies show different prices or items. MenuList gives every public surface one current approved menu source.',
        audience: 'Independent restaurants, casual dining, QSR counters, family restaurants, and owner-run food brands.',
        ctaLabel: 'Upload your current menu',
        ctaPath: '/create-menu',
        secondaryCtaLabel: 'See how it works',
        secondaryCtaPath: '/how-it-works',
        proof: [
            'Current approved menu',
            'QR menu destination',
            'Official Business Page',
            'Google and social links',
            'PDF and print handoff',
            'Menu review before publishing',
            'Structured public menu page',
        ],
        fit: [
            'Replace old menu files with one stable official menu URL.',
            'Keep item names, prices, sections, and public business details aligned.',
            'Use the same current approved menu source behind QR, website, WhatsApp, screens, and print assets.',
            'Give search and AI systems clearer public menu information to read when they choose to crawl it.',
        ],
        resourceLinks: [
            { label: 'Official menu source', href: '/resources/official-menu-source' },
            { label: 'Menu engineering', href: '/resources/menu-engineering' },
            { label: 'Google menu guide', href: '/resources/google-business-profile-menu' },
        ],
        faq: [
            {
                question: 'Is MenuList a QR menu maker?',
                answer: 'No. QR codes are one doorway into the current approved menu source. The source behind the QR is the important part.',
            },
            {
                question: 'Does MenuList replace a POS?',
                answer: 'No. MenuList is the public customer-facing menu source layer. It does not replace POS, ordering, billing, or delivery systems.',
            },
        ],
    },
    {
        slug: 'cafes-bakeries',
        canonicalPath: '/industries/cafes-bakeries',
        metaTitle: 'Digital Menu Source for Cafes and Bakeries | MenuList',
        metaDescription: 'Keep cafe, bakery, dessert, and beverage menus current across QR, Google, social links, website links, seasonal specials, and print materials.',
        eyebrow: 'For cafes and bakeries',
        title: 'Keep cafe and bakery menus current everywhere customers look.',
        highlight: 'menus current',
        description: 'Cafes and bakeries change specials, item availability, seasonal products, and prices often. MenuList keeps the public customer-facing version tied to one approved source.',
        audience: 'Cafes, bakeries, dessert shops, beverage counters, sweet shops, and seasonal food brands.',
        ctaLabel: 'Upload your current menu',
        ctaPath: '/create-menu',
        secondaryCtaLabel: 'Use the update checklist',
        secondaryCtaPath: '/resources/menu-update-checklist',
        proof: [
            'Seasonal menu updates',
            'QR and counter links',
            'Google menu source',
            'Instagram and WhatsApp links',
            'Print-ready backup files',
            'Current public page',
        ],
        fit: [
            'Keep daily or seasonal menu changes from turning into scattered files.',
            'Point packaging, counter cards, and social links to one current menu URL.',
            'Keep public photos and descriptions aligned with the items customers can order.',
            'Use PDFs as print backup, not the main public menu source.',
        ],
        resourceLinks: [
            { label: 'Menu update checklist', href: '/resources/menu-update-checklist' },
            { label: 'Digital menu vs PDF', href: '/resources/digital-menu-vs-pdf-menu' },
            { label: 'QR menu setup', href: '/resources/qr-menu-for-restaurants' },
        ],
        faq: [
            {
                question: 'Can cafes still use printed menus?',
                answer: 'Yes. Printed menus and PDFs can remain useful when they are generated from or checked against the current approved menu source.',
            },
            {
                question: 'Does MenuList manage inventory?',
                answer: 'No. MenuList keeps the public menu source current. Inventory or POS-level stock control stays in the business systems that manage it.',
            },
        ],
    },
    {
        slug: 'takeaway-cloud-kitchens',
        canonicalPath: '/industries/takeaway-cloud-kitchens',
        metaTitle: 'Public Menu Source for Takeaways and Cloud Kitchens | MenuList',
        metaDescription: 'Keep takeaway and cloud kitchen menus consistent across QR links, WhatsApp, Google, social profiles, website links, packaging, and customer share links.',
        eyebrow: 'For takeaways and cloud kitchens',
        title: 'One public menu source for takeaways and cloud kitchens.',
        highlight: 'public menu source',
        description: 'Takeaways and cloud kitchens often depend on WhatsApp, Google, social profiles, packaging QR codes, and customer-shared links. MenuList keeps those links pointed toward one current approved menu.',
        audience: 'Takeaways, pickup kitchens, cloud kitchens, delivery-light food businesses, and WhatsApp-led food brands.',
        ctaLabel: 'Create your official menu link',
        ctaPath: '/create-menu',
        secondaryCtaLabel: 'Open the URL checklist',
        secondaryCtaPath: '/resources/official-menu-url-checklist',
        proof: [
            'WhatsApp-ready link',
            'Packaging QR source',
            'Google menu link',
            'Customer share link',
            'Public menu page',
            'Stable URL after updates',
        ],
        fit: [
            'Use one menu URL in WhatsApp replies, social profiles, packaging, and website buttons.',
            'Reduce old menu screenshots moving through customer chats.',
            'Keep item names and prices visible without requiring a full website build.',
            'Preserve clear public information without becoming a delivery marketplace.',
        ],
        resourceLinks: [
            { label: 'Official menu URL checklist', href: '/resources/official-menu-url-checklist' },
            { label: 'Official menu source', href: '/resources/official-menu-source' },
            { label: 'QR menu mistakes', href: '/resources/restaurant-qr-menu-mistakes' },
        ],
        faq: [
            {
                question: 'Is MenuList a delivery marketplace?',
                answer: 'No. MenuList provides the current public menu source and official link. Delivery or ordering handoffs stay with the business tools already used.',
            },
            {
                question: 'Can the same link be used on WhatsApp and packaging?',
                answer: 'Yes. The same stable public menu URL can be used anywhere customers need the current menu.',
            },
        ],
    },
    {
        slug: 'multi-location-food-businesses',
        canonicalPath: '/industries/multi-location-food-businesses',
        metaTitle: 'Multi-location Menu Source Control | MenuList',
        metaDescription: 'Keep branch menus consistent with a master menu, outlet overrides, branch pricing, local availability, QR links, Google links, and public branch pages.',
        eyebrow: 'For multi-location food businesses',
        title: 'Menu source control for multi-location food businesses.',
        highlight: 'source control',
        description: 'Multi-location menus drift when branches edit prices, hide items, print QR cards, or share local files independently. MenuList keeps the master source and branch differences easier to govern.',
        audience: 'Chains, franchise groups, outlet operators, food trucks with multiple stops, and regional food brands.',
        ctaLabel: 'Manage menus across locations',
        ctaPath: '/create-menu',
        secondaryCtaLabel: 'Read the multi-location guide',
        secondaryCtaPath: '/resources/multi-location-menu-management',
        proof: [
            'Master menu source',
            'Outlet differences',
            'Branch QR links',
            'Local availability',
            'Public branch pages',
            'Approved update governance',
        ],
        fit: [
            'Keep shared item names, sections, and descriptions aligned across outlets.',
            'Allow controlled branch-specific pricing, availability, and local details.',
            'Use branch-specific public links where customer truth differs by location.',
            'Reduce menu drift without claiming franchise compliance automation or POS replacement.',
        ],
        resourceLinks: [
            { label: 'Multi-location menu management', href: '/resources/multi-location-menu-management' },
            { label: 'Official menu source', href: '/resources/official-menu-source' },
            { label: 'Menu update checklist', href: '/resources/menu-update-checklist' },
        ],
        faq: [
            {
                question: 'Can branches have different prices?',
                answer: 'Yes, when the product setup supports branch-level differences. The important part is keeping those differences approved and visible in the right public branch source.',
            },
            {
                question: 'Does MenuList enforce franchise compliance automatically?',
                answer: 'No. MenuList supports source control and branch consistency, but it does not claim automatic franchise compliance enforcement.',
            },
        ],
    },
];

export function getWebsiteIndustryPage(slug: string): WebsiteIndustryPage | undefined {
    return websiteIndustryPages.find((page) => page.slug === slug);
}
