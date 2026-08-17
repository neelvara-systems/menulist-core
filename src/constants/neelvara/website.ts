import { getProductDeploymentTarget } from '@constant/deploymentTargets';

export const NEELVARA_SITE_URL = getProductDeploymentTarget('neelvara', 'production').url;
export const NEELVARA_TRADE_NAME = 'Neelvara Systems';
export const NEELVARA_PUBLIC_BRAND = 'Neelvara';
export const NEELVARA_SITE_TITLE =
    'Neelvara Systems - Operating Company for MenuList and Answerlattice';
export const NEELVARA_SITE_DESCRIPTION =
    'Neelvara Systems (Neelvara) operates MenuList and Answerlattice for customer-facing business information.';
export const NEELVARA_BUSINESS_DESCRIPTION =
    'Software development and SaaS platforms for customer-facing business information management, online business profiles, digital listings, catalogues and menus, reputation and discovery information systems, data processing, and automation related to customer-facing business information.';
export const NEELVARA_LOGO_PATH = '/neelvara-logo.svg';
export const NEELVARA_OG_IMAGE_PATH = '/neelvara-og-image.png';

const publicEnvOrFallback = (value: string | undefined, fallback: string) => value?.trim() || fallback;

export const NEELVARA_CONTACT_EMAIL = publicEnvOrFallback(
    process.env.NEXT_PUBLIC_NEELVARA_CONTACT_EMAIL,
    'hello@neelvara.com',
);
export const NEELVARA_LEGAL_EMAIL = publicEnvOrFallback(
    process.env.NEXT_PUBLIC_NEELVARA_LEGAL_EMAIL,
    'legal@neelvara.com',
);
export const NEELVARA_PRIVACY_EMAIL = publicEnvOrFallback(
    process.env.NEXT_PUBLIC_NEELVARA_PRIVACY_EMAIL,
    'privacy@neelvara.com',
);
export const NEELVARA_MENULIST_URL = getProductDeploymentTarget('menulist', 'production').url;
export const NEELVARA_ANSWERLATTICE_URL = getProductDeploymentTarget('answerlattice', 'production').url;
export const NEELVARA_RELATIONSHIP_LINE =
    'MenuList and Answerlattice are operated by Neelvara Systems.';

export const NEELVARA_PRODUCT_LINEUP = [
    {
        name: 'MenuList',
        status: 'Operated product',
        url: NEELVARA_MENULIST_URL,
        summary: 'Keeps menus, hours, profiles, and customer-facing details in a public business information source.',
    },
    {
        name: 'Answerlattice',
        status: 'Operated product',
        url: NEELVARA_ANSWERLATTICE_URL,
        summary: 'Keeps support knowledge, help content, and business responses tied to approved answers.',
    },
] as const;

export const NEELVARA_PUBLIC_PAGES: Array<{
    path: string;
    title: string;
    description: string;
    priority: number;
    changeFrequency: 'monthly' | 'yearly';
}> = [
    {
        path: '/',
        title: NEELVARA_SITE_TITLE,
        description: NEELVARA_SITE_DESCRIPTION,
        priority: 1,
        changeFrequency: 'monthly',
    },
    {
        path: '/products',
        title: 'Operated Products - Neelvara Systems',
        description: 'MenuList and Answerlattice are operated by Neelvara Systems. Visit their official product websites.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/about',
        title: 'About - Neelvara Systems',
        description: 'The operating focus and boundaries of Neelvara Systems.',
        priority: 0.7,
        changeFrequency: 'yearly',
    },
    {
        path: '/contact',
        title: 'Contact - Neelvara Systems',
        description: 'Business, legal, and privacy contact points for Neelvara Systems.',
        priority: 0.7,
        changeFrequency: 'yearly',
    },
    {
        path: '/legal',
        title: 'Legal - Neelvara Systems',
        description: 'Entity and operating relationship information for Neelvara Systems.',
        priority: 0.6,
        changeFrequency: 'yearly',
    },
    {
        path: '/privacy',
        title: 'Privacy - Neelvara Systems',
        description: 'Privacy information for the Neelvara Systems website.',
        priority: 0.5,
        changeFrequency: 'yearly',
    },
    {
        path: '/terms',
        title: 'Terms - Neelvara Systems',
        description: 'Terms for use of the Neelvara Systems website.',
        priority: 0.5,
        changeFrequency: 'yearly',
    },
];

export function buildNeelvaraUrl(path: string = '/'): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return new URL(cleanPath, NEELVARA_SITE_URL).toString();
}
