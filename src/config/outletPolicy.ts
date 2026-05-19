/**
 * Outlet Policy Categories — Shared config for desktop + mobile
 *
 * Used by:
 * - Desktop: OutletPolicyEditor (src/components/organisms/OutletPolicyEditor/index.tsx)
 * - Mobile: MobileLocationsScreen (src/components/mobile/screens/MobileLocationsScreen.tsx)
 *
 * Single source of truth for the 15 policy toggle groupings.
 */

import { OutletPolicy } from '@type/multiOutlet.types';

export interface PolicyCategoryItem {
    key: keyof OutletPolicy;
    label: string;
    description: string;
}

export interface PolicyCategory {
    label: string;
    description: string;
    items: PolicyCategoryItem[];
}

export const OUTLET_POLICY_CATEGORIES: PolicyCategory[] = [
    {
        label: 'Override Control',
        description: 'What outlets can change on inherited menu items',
        items: [
            { key: 'priceOverride', label: 'Price Override', description: 'Outlets can set their own prices for inherited items' },
            { key: 'availabilityOverride', label: 'Availability Override', description: 'Outlets can toggle item availability (in/out of stock)' },
            { key: 'descriptionOverride', label: 'Description Override', description: 'Outlets can edit item descriptions' },
            { key: 'imageOverride', label: 'Image Override', description: 'Outlets can replace item images' },
        ],
    },
    {
        label: 'Local Content',
        description: 'What outlets can add on their own',
        items: [
            { key: 'allowLocalItems', label: 'Local Items', description: 'Outlets can add their own menu items (not from master)' },
            { key: 'allowLocalCategories', label: 'Local Categories', description: 'Outlets can create their own categories' },
            { key: 'allowLocalProjects', label: 'Local Projects', description: 'Outlets can create entirely separate menu projects' },
            { key: 'allowProjectDeactivate', label: 'Deactivate Projects', description: 'Outlets can deactivate inherited projects' },
        ],
    },
    {
        label: 'AI Features',
        description: 'Credit-consuming AI tools (affects your billing)',
        items: [
            { key: 'canUseMenuExtraction', label: 'Menu Extraction', description: 'Outlets can run AI menu extraction from images' },
            { key: 'canGenerateDescriptions', label: 'Descriptions', description: 'Outlets can generate item descriptions' },
            { key: 'canGenerateImages', label: 'AI Images', description: 'Outlets can generate AI item images' },
        ],
    },
    {
        label: 'Branding',
        description: 'Visual identity controls',
        items: [
            { key: 'canOverrideTheme', label: 'Theme/Colors', description: 'Outlets can customize colors and fonts' },
            { key: 'canOverrideBrandIdentity', label: 'Brand Identity', description: 'Outlets can change logo and brand images' },
            { key: 'canOverrideLayout', label: 'Layout', description: 'Outlets can modify the menu layout' },
        ],
    },
    {
        label: 'Language',
        description: 'Multi-language controls',
        items: [
            { key: 'canAddLanguages', label: 'Add Languages', description: 'Outlets can enable additional languages from your language list' },
        ],
    },
];
