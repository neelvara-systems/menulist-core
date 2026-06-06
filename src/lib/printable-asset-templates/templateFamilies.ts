import type { PrintableTemplateFamily, PrintableTemplateFamilyId } from './types';

export const DEFAULT_PRINTABLE_TEMPLATE_FAMILY_ID: PrintableTemplateFamilyId = 'modern-calm';

export const PRINTABLE_TEMPLATE_FAMILIES: PrintableTemplateFamily[] = [
    {
        accentLabel: 'Cream + gold',
        bestFor: 'Restaurants, cafes, bakeries, salons',
        description: 'Formal cream paper, fine border, and premium gold accents.',
        id: 'classic-luxe',
        label: 'Classic Luxe',
        tier: 'starter',
        tone: 'heritage',
    },
    {
        accentLabel: 'Dark + gold',
        bestFor: 'Fine dining, lounges, premium services',
        description: 'Dark surface, strong contrast, and metallic accent treatment.',
        id: 'executive-dark',
        label: 'Executive Dark',
        tier: 'pro',
        tone: 'dark',
    },
    {
        accentLabel: 'Green heritage',
        bestFor: 'Wellness, organic, local, boutique',
        description: 'Deep green cues with warm paper and heritage framing.',
        id: 'botanical-heritage',
        label: 'Botanical Heritage',
        tier: 'pro',
        tone: 'heritage',
    },
    {
        accentLabel: 'Quiet brand',
        bestFor: 'Most small businesses',
        description: 'Clean brand band, clear hierarchy, and roomy scan area.',
        id: 'modern-calm',
        label: 'Modern Calm',
        tier: 'starter',
        tone: 'light',
    },
    {
        accentLabel: 'Large brand strip',
        bestFor: 'Logo-led businesses',
        description: 'Bold header strip with a centered identity badge.',
        id: 'brand-banner',
        label: 'Brand Banner',
        tier: 'pro',
        tone: 'bold',
    },
    {
        accentLabel: 'Soft curve',
        bestFor: 'Beauty, spa, wellness, family dining',
        description: 'Gentle curved panels and softer business presentation.',
        id: 'soft-curve',
        label: 'Soft Curve',
        tier: 'pro',
        tone: 'light',
    },
    {
        accentLabel: 'Large QR',
        bestFor: 'Busy counters and high-traffic tables',
        description: 'Large scan area with minimal copy and direct instruction.',
        id: 'qr-first',
        label: 'QR First',
        tier: 'starter',
        tone: 'minimal',
    },
    {
        accentLabel: 'Bold local',
        bestFor: 'Fast casual, takeout, local shops',
        description: 'High-confidence name lockup, strong banner, and simple URL.',
        id: 'local-bold',
        label: 'Local Bold',
        tier: 'pro',
        tone: 'bold',
    },
    {
        accentLabel: 'Low ink',
        bestFor: 'Budget print and utility locations',
        description: 'Printer-friendly output with clear borders and low ink use.',
        id: 'clean-utility',
        label: 'Clean Utility',
        tier: 'starter',
        tone: 'utility',
    },
];

export function isPrintableTemplateFamilyId(value?: string | null): value is PrintableTemplateFamilyId {
    return PRINTABLE_TEMPLATE_FAMILIES.some((family) => family.id === value);
}

export function normalizePrintableTemplateFamilyId(value?: string | null): PrintableTemplateFamilyId {
    return isPrintableTemplateFamilyId(value) ? value : DEFAULT_PRINTABLE_TEMPLATE_FAMILY_ID;
}

export function getPrintableTemplateFamily(id?: string | null): PrintableTemplateFamily {
    const normalized = normalizePrintableTemplateFamilyId(id);
    return PRINTABLE_TEMPLATE_FAMILIES.find((family) => family.id === normalized) || PRINTABLE_TEMPLATE_FAMILIES[0];
}

export function mapPrintableTemplateToMenuCardStyle(id?: string | null): 'classic' | 'compact' | 'premium' {
    const familyId = normalizePrintableTemplateFamilyId(id);
    if (familyId === 'qr-first' || familyId === 'clean-utility' || familyId === 'local-bold') return 'compact';
    if (familyId === 'classic-luxe' || familyId === 'executive-dark' || familyId === 'botanical-heritage' || familyId === 'soft-curve') return 'premium';
    return 'classic';
}
