import { getProductDeploymentTarget } from '@constant/deploymentTargets';

export const CONSTANTLAYER_SITE_URL = getProductDeploymentTarget('constantlayer', 'production').url;
export const CONSTANTLAYER_SITE_TITLE = 'ConstantLayer Systems - Company Reference For Public Product Surfaces';
export const CONSTANTLAYER_SITE_DESCRIPTION =
    'ConstantLayer Systems is the company reference for the current public product lineup: MenuList, Answerlattice, and CampaignCue.';

export const CONSTANTLAYER_CONTACT_EMAIL = 'hello@constantlayer.in';
export const CONSTANTLAYER_LEGAL_EMAIL = 'legal@constantlayer.in';
export const CONSTANTLAYER_PRIVACY_EMAIL = 'privacy@constantlayer.in';
export const CONSTANTLAYER_MENULIST_URL = getProductDeploymentTarget('menulist', 'production').url;
export const CONSTANTLAYER_ANSWERLATTICE_URL = getProductDeploymentTarget('answerlattice', 'production').url;
export const CONSTANTLAYER_CAMPAIGNCUE_URL = getProductDeploymentTarget('campaigncue', 'production').url;
export const CONSTANTLAYER_RELATIONSHIP_LINE =
    'MenuList, Answerlattice, and CampaignCue are the current public product surfaces in the ConstantLayer Systems lineup.';

export const CONSTANTLAYER_PRODUCT_LINEUP = [
    {
        name: 'MenuList',
        status: 'Public product',
        url: CONSTANTLAYER_MENULIST_URL,
        summary: 'Business information infrastructure for menus, store facts, and public customer-facing surfaces.',
    },
    {
        name: 'Answerlattice',
        status: 'Public product',
        url: CONSTANTLAYER_ANSWERLATTICE_URL,
        summary: 'Governed answer infrastructure for support knowledge, approved answers, widgets, and help surfaces.',
    },
    {
        name: 'CampaignCue',
        status: 'Public product',
        url: CONSTANTLAYER_CAMPAIGNCUE_URL,
        summary: 'Campaign readiness and source-backed campaign output systems for local businesses.',
    },
] as const;

export const CONSTANTLAYER_PUBLIC_PAGES: Array<{
    path: string;
    title: string;
    description: string;
    priority: number;
    changeFrequency: 'monthly' | 'yearly';
}> = [
    {
        path: '/',
        title: CONSTANTLAYER_SITE_TITLE,
        description: CONSTANTLAYER_SITE_DESCRIPTION,
        priority: 1,
        changeFrequency: 'monthly',
    },
    {
        path: '/products',
        title: 'Products - ConstantLayer Systems',
        description: 'The current public product lineup represented by ConstantLayer Systems.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/about',
        title: 'About - ConstantLayer Systems',
        description: 'The operating focus and boundaries of ConstantLayer Systems.',
        priority: 0.7,
        changeFrequency: 'yearly',
    },
    {
        path: '/contact',
        title: 'Contact - ConstantLayer Systems',
        description: 'Business, legal, and privacy contact points for ConstantLayer Systems.',
        priority: 0.7,
        changeFrequency: 'yearly',
    },
    {
        path: '/legal',
        title: 'Legal - ConstantLayer Systems',
        description: 'Entity and operating relationship information for ConstantLayer Systems.',
        priority: 0.6,
        changeFrequency: 'yearly',
    },
    {
        path: '/privacy',
        title: 'Privacy - ConstantLayer Systems',
        description: 'Privacy information for the ConstantLayer Systems website.',
        priority: 0.5,
        changeFrequency: 'yearly',
    },
    {
        path: '/terms',
        title: 'Terms - ConstantLayer Systems',
        description: 'Terms for use of the ConstantLayer Systems website.',
        priority: 0.5,
        changeFrequency: 'yearly',
    },
];

export function buildConstantLayerUrl(path: string = '/'): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return new URL(cleanPath, CONSTANTLAYER_SITE_URL).toString();
}
