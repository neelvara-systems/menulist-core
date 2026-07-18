export type WebsiteIndustryPage = {
    audience: string;
    canonicalPath: string;
    ctaLabel: string;
    ctaPath: string;
    description: string;
    demo?: {
        caption: string;
        imageAlt: string;
        imageSrc: string;
        label: string;
        title: string;
    };
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
    {
        slug: 'salons-spas',
        canonicalPath: '/industries/salons-spas',
        metaTitle: 'Digital Service List for Salons and Spas | MenuList',
        metaDescription: 'Turn salon, barber, beauty, and spa service lists into one official customer link for WhatsApp, Instagram, Google, QR, and front-desk sharing.',
        eyebrow: 'For salons and spas',
        title: 'One official service list for beauty, grooming, and spa customers.',
        highlight: 'official service list',
        description: 'Salon and spa prices drift when Instagram highlights, WhatsApp images, posters, booking links, and staff replies show different services or packages. MenuList gives customers one current approved service list before they call, book, or visit.',
        audience: 'Salons, barber shops, beauty studios, spas, grooming studios, nail studios, and bridal-prep teams.',
        ctaLabel: 'Upload your service list',
        ctaPath: '/create-menu',
        secondaryCtaLabel: 'See WhatsApp intake',
        secondaryCtaPath: '/whatsapp',
        proof: [
            'Current service list',
            'WhatsApp-ready link',
            'Instagram bio destination',
            'Front-desk QR',
            'Official Business Page',
            'Packages and durations',
            'Owner review before publishing',
        ],
        fit: [
            'Keep service names, prices, durations, package notes, and public actions aligned.',
            'Use one link across WhatsApp replies, Instagram bio, Google profile links, QR cards, and reception counters.',
            'Show services and prices without claiming MenuList replaces booking, POS, staff scheduling, or salon management systems.',
            'Give search and AI systems clearer visible service-list information to read when they choose to crawl it.',
        ],
        resourceLinks: [
            { label: 'WhatsApp onboarding', href: '/whatsapp' },
            { label: 'Official customer link', href: '/resources/official-menu-url-checklist' },
            { label: 'Public discovery', href: '/features/public-discovery' },
        ],
        faq: [
            {
                question: 'Is MenuList a booking system for salons?',
                answer: 'No. MenuList provides the current public service-list and official customer link. Booking, staff scheduling, and payments stay with the tools the salon already uses.',
            },
            {
                question: 'Can a salon use prices, durations, and packages?',
                answer: 'Yes. Service names, visible prices, durations, packages, notes, and contact actions can be part of the approved public service list when the owner publishes them.',
            },
        ],
    },
    {
        slug: 'service-list-businesses',
        canonicalPath: '/industries/service-list-businesses',
        metaTitle: 'Official Service List Link for SMBs | MenuList',
        metaDescription: 'Create one customer-facing service-list link for SMB price lists, packages, rate cards, QR codes, WhatsApp replies, social links, and business pages.',
        eyebrow: 'For service-list businesses',
        title: 'Turn a service list or price list into one customer link.',
        highlight: 'one customer link',
        description: 'Many SMBs do not need a restaurant menu. They need a clear public list of services, packages, prices, durations, care notes, add-ons, and inquiry actions that stays current across chats, social profiles, QR cards, and website buttons.',
        audience: 'Pet groomers, repair shops, studios, classes, local clinics, laundry services, florists, decorators, photographers, and other list-driven SMBs.',
        ctaLabel: 'Create your service link',
        ctaPath: '/create-menu',
        secondaryCtaLabel: 'Read the setup flow',
        secondaryCtaPath: '/how-it-works',
        proof: [
            'Service names and prices',
            'Package lists',
            'Rate cards',
            'Add-ons and notes',
            'WhatsApp inquiry action',
            'QR and social links',
            'Structured public page',
        ],
        fit: [
            'Replace repeated price-list screenshots with one approved public link customers can reopen.',
            'Group services, packages, add-ons, and visible prices without forcing a restaurant-only menu format.',
            'Keep the same approved list behind WhatsApp replies, Instagram links, QR cards, website buttons, and customer shortcuts.',
            'Use structured public information without promising search rankings, AI citations, or automatic external-platform updates.',
        ],
        resourceLinks: [
            { label: 'Official customer link checklist', href: '/resources/official-menu-url-checklist' },
            { label: 'WhatsApp onboarding', href: '/whatsapp' },
            { label: 'AI search discovery', href: '/resources/ai-search-menu-discovery' },
        ],
        faq: [
            {
                question: 'Does MenuList only work for food menus?',
                answer: 'No. Food menus are one strong use case, but MenuList also supports customer-facing service lists, price lists, package lists, rate cards, and catalog-style lists.',
            },
            {
                question: 'Does MenuList replace a website?',
                answer: 'No. MenuList can give a business a stable official customer link. A full website can still exist and can point customers to that current list.',
            },
        ],
    },
    {
        slug: 'local-service-businesses',
        canonicalPath: '/industries/local-service-businesses',
        metaTitle: 'Package and Rate Card Links for Local Services | MenuList',
        metaDescription: 'Publish one current package or rate-card link for local service businesses using WhatsApp, QR, Instagram, website buttons, and customer inquiry flows.',
        eyebrow: 'For local service businesses',
        title: 'One current package list before customers ask for rates.',
        highlight: 'current package list',
        description: 'Local service businesses often answer the same price and package questions in WhatsApp, phone calls, posters, and social DMs. MenuList turns the current approved rate card into a public customer link that can be shared before the inquiry.',
        audience: 'Auto detailing, cleaning, laundry, repair, grooming, event, photography, decor, coaching, and other local service teams.',
        ctaLabel: 'Upload your rate card',
        ctaPath: '/create-menu',
        secondaryCtaLabel: 'Use the WhatsApp flow',
        secondaryCtaPath: '/whatsapp',
        proof: [
            'Package and rate cards',
            'Add-on services',
            'Starting prices',
            'WhatsApp inquiry link',
            'Counter or workshop QR',
            'Service notes',
            'Owner-approved updates',
        ],
        fit: [
            'Publish clear package groups, add-ons, and starting prices before a customer messages for rates.',
            'Keep old posters, PDFs, and forwarded images from becoming the trusted price source.',
            'Use one list link across WhatsApp, Instagram, Google profile links, counter QR, and website actions.',
            'Keep inquiry handoff separate from booking, invoicing, payments, dispatch, or field-service operations.',
        ],
        resourceLinks: [
            { label: 'WhatsApp onboarding', href: '/whatsapp' },
            { label: 'Menu source audit', href: '/resources/menu-source-audit' },
            { label: 'QR placement checklist', href: '/resources/qr-code-placement-checklist' },
        ],
        faq: [
            {
                question: 'Can the page show starting prices instead of fixed prices?',
                answer: 'Yes, when the owner publishes them that way. The page should show only what the business has approved for customers to see.',
            },
            {
                question: 'Does MenuList manage service jobs or dispatch?',
                answer: 'No. MenuList keeps the public service-list or package-list source current. Job management, dispatch, invoicing, and payments stay outside MenuList.',
            },
        ],
    },
];

export function getWebsiteIndustryPage(slug: string): WebsiteIndustryPage | undefined {
    return websiteIndustryPages.find((page) => page.slug === slug);
}
