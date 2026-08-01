export type PrintReadinessStatus = 'ready' | 'attention' | 'info';

export type PrintReadinessItem = {
    description: string;
    id: string;
    status: PrintReadinessStatus;
    title: string;
};

export type PrintGuidanceInput = {
    hasFeedbackEnabled?: boolean;
    menuLink?: string | null;
    shortMenuLink?: string | null;
    storeData?: unknown;
    storeLogo?: string | null;
    storeName?: string | null;
};

export const PRINT_SHOP_FILE_SPECS = [
    'Table Tent: A5 landscape, fold to two A6 faces, 300 GSM matte card',
    'Single Table Card: A6 portrait, 300 GSM matte card',
    'Counter Sticker: 80mm x 80mm matte vinyl sticker',
    'Entrance Poster: A4 portrait, 200-300 GSM matte paper',
    'Flyer: A5 portrait, 170-250 GSM matte paper',
    'Gift Certificate: gift-card landscape, 250-300 GSM matte card',
    'Business Card: front/back faces, each 90mm x 55mm, 300 GSM matte card',
    'Invitation: A6 portrait, 250-300 GSM matte card',
    'Postcard: A6 landscape, 250-300 GSM matte card',
    'Product Tag: 90mm x 50mm, 250-300 GSM matte card or tag stock',
    'Campaign Poster: A4 portrait, 200-300 GSM matte paper',
] as const;

export const PRINT_ASSET_REPRINT_GUIDANCE = [
    'Content and price updates do not need reprint because the QR opens the live page.',
    'Reprint when the business logo, business name, brand color, domain, or QR destination changes.',
    'Reprint damaged, faded, stained, or bent table and counter pieces.',
] as const;

function readOwnField(value: unknown, key: string): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    try {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    } catch {
        return undefined;
    }
}

function normalizeGuidanceText(value: unknown, maxLength: number): string {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function hasConfiguredPrintBrandColor(storeData?: unknown): boolean {
    return Boolean(resolveStoreBrandColor(storeData));
}

export function buildPrintReadinessItems(input: PrintGuidanceInput): PrintReadinessItem[] {
    const storeName = normalizeGuidanceText(input.storeName, 200);
    const hasLogo = Boolean(
        normalizeGuidanceText(input.storeLogo, 2048)
        || normalizeGuidanceText(readOwnField(input.storeData, 'logo'), 2048),
    );
    const hasBrandColor = hasConfiguredPrintBrandColor(input.storeData);
    const hasMenuLink = Boolean(normalizeGuidanceText(input.menuLink, 2048));
    const hasLongName = storeName.length > 42;

    return [
        {
            description: hasMenuLink
                ? 'Every print file opens the selected live page.'
                : 'Select or publish a project before printing.',
            id: 'live-link',
            status: hasMenuLink ? 'ready' : 'attention',
            title: hasMenuLink ? 'Live link ready' : 'Menu link missing',
        },
        {
            description: hasLogo
                ? 'Logo will appear where the print format supports it.'
                : 'Add a logo for a stronger printed identity.',
            id: 'logo',
            status: hasLogo ? 'ready' : 'attention',
            title: hasLogo ? 'Logo ready' : 'Logo missing',
        },
        {
            description: hasBrandColor
                ? 'Print files use the stored brand color.'
                : 'A neutral MenuList print color will be used.',
            id: 'brand-color',
            status: hasBrandColor ? 'ready' : 'info',
            title: hasBrandColor ? 'Brand color ready' : 'Brand color uses default',
        },
        {
            description: hasLongName
                ? 'Long names may wrap on smaller cards; preview before printing.'
                : 'Business name fits normal print layouts.',
            id: 'business-name',
            status: hasLongName ? 'attention' : 'ready',
            title: hasLongName ? 'Check business name length' : 'Business name ready',
        },
        {
            description: input.hasFeedbackEnabled
                ? 'Feedback QR can be printed for counter or exit placement.'
                : 'Feedback QR is hidden until feedback is enabled.',
            id: 'feedback',
            status: input.hasFeedbackEnabled ? 'ready' : 'info',
            title: input.hasFeedbackEnabled ? 'Feedback QR available' : 'Feedback QR disabled',
        },
    ];
}

export function buildPrintShopHandoffMessage(input: PrintGuidanceInput): string {
    const storeName = normalizeGuidanceText(input.storeName, 200) || 'MenuList business';
    const menuLink = normalizeGuidanceText(input.shortMenuLink, 2048)
        || normalizeGuidanceText(input.menuLink, 2048)
        || 'Menu link is included in the QR files.';

    return [
        `Print files for ${storeName}`,
        '',
        'Please print these files:',
        ...PRINT_SHOP_FILE_SPECS.map((spec) => `- ${spec}`),
        '',
        `Menu link: ${menuLink}`,
        '',
        'Please test one QR scan before bulk printing.',
        'Use matte finish where possible so the QR scans cleanly under lights.',
    ].join('\n');
}
import { resolveStoreBrandColor } from '@lib/menu-kit/brandTokens';
