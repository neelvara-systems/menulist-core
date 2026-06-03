/**
 * Outlet Policy Categories - shared config for desktop + mobile.
 *
 * Used by:
 * - Desktop: OutletPolicyEditor (src/components/organisms/OutletPolicyEditor/index.tsx)
 * - Mobile: MobileLocationsScreen (src/components/mobile/screens/MobileLocationsScreen.tsx)
 *
 * Single source of truth for the 15 policy toggle groupings and owner-facing
 * explanations. Keep this copy non-technical because it appears in settings.
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
        label: 'Inherited Menu Changes',
        description: 'Controls what an outlet can change on menus inherited from HQ.',
        items: [
            { key: 'priceOverride', label: 'Change item prices', description: 'Outlet teams can set local prices for inherited items and variants.' },
            { key: 'availabilityOverride', label: 'Mark items unavailable', description: 'Outlet teams can turn inherited items on or off for local stock and service availability.' },
            { key: 'descriptionOverride', label: 'Edit item descriptions', description: 'Outlet teams can keep local wording for inherited item descriptions.' },
            { key: 'imageOverride', label: 'Replace item photos', description: 'Outlet teams can use local photos for inherited items.' },
        ],
    },
    {
        label: 'Local Menu Additions',
        description: 'Controls what an outlet can add without changing the HQ menu.',
        items: [
            { key: 'allowLocalItems', label: 'Add local items', description: 'Outlet teams can add items that only belong to their outlet.' },
            { key: 'allowLocalCategories', label: 'Add local categories', description: 'Outlet teams can create local categories for their own items.' },
            { key: 'allowLocalProjects', label: 'Create local menus', description: 'Outlet teams can create separate outlet-only menus.' },
            { key: 'allowProjectDeactivate', label: 'Turn off inherited menus', description: 'Outlet teams can hide an inherited menu at their outlet.' },
        ],
    },
    {
        label: 'Menu Tools',
        description: 'Controls tools that can use account credits or generated content.',
        items: [
            { key: 'canUseMenuExtraction', label: 'Upload menus for extraction', description: 'Outlet teams can upload photos or PDFs to read menu items into the editor.' },
            { key: 'canGenerateDescriptions', label: 'Generate descriptions', description: 'Outlet teams can generate item descriptions where local description changes are allowed.' },
            { key: 'canGenerateImages', label: 'Generate item images', description: 'Outlet teams can generate item images where local photo changes are allowed.' },
        ],
    },
    {
        label: 'Menu Design',
        description: 'Controls whether outlets can adjust the customer-facing menu design.',
        items: [
            { key: 'canOverrideTheme', label: 'Change colors and fonts', description: 'Outlet teams can adjust menu colors and typography.' },
            { key: 'canOverrideBrandIdentity', label: 'Change outlet branding', description: 'Outlet teams can keep separate outlet branding and business classification.' },
            { key: 'canOverrideLayout', label: 'Change menu layout', description: 'Outlet teams can adjust layout choices for their outlet menu.' },
        ],
    },
    {
        label: 'Languages',
        description: 'Controls language changes at outlet level.',
        items: [
            { key: 'canAddLanguages', label: 'Enable menu languages', description: 'Outlet teams can enable additional languages from the account language list.' },
        ],
    },
];
