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
    storeData?: Record<string, any> | null;
    storeLogo?: string | null;
    storeName?: string | null;
};

export const PRINT_SHOP_FILE_SPECS = [
    'Table Tent: A5 landscape, fold to two A6 faces, 300 GSM matte card',
    'Single Table Card: A6 portrait, 300 GSM matte card',
    'Counter Sticker: 80mm x 80mm matte vinyl sticker',
    'Entrance Poster: A4 portrait, 200-300 GSM matte paper',
] as const;

export const PRINT_ASSET_REPRINT_GUIDANCE = [
    'Content and price updates do not need reprint because the QR opens the live page.',
    'Reprint when the business logo, business name, brand color, domain, or QR destination changes.',
    'Reprint damaged, faded, stained, or bent table and counter pieces.',
] as const;

export function hasConfiguredPrintBrandColor(storeData?: Record<string, any> | null): boolean {
    const color = storeData?.publicPresence?.accentColor
        || storeData?.primaryColor
        || storeData?.brandColor
        || storeData?.themeColor;
    return typeof color === 'string' && color.trim().length > 0;
}

export function buildPrintReadinessItems(input: PrintGuidanceInput): PrintReadinessItem[] {
    const storeName = input.storeName?.trim() || '';
    const hasLogo = Boolean(input.storeLogo || input.storeData?.logo);
    const hasBrandColor = hasConfiguredPrintBrandColor(input.storeData);
    const hasMenuLink = Boolean(input.menuLink);
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
    const storeName = input.storeName?.trim() || 'MenuList business';
    const menuLink = input.shortMenuLink || input.menuLink || 'Menu link is included in the QR files.';

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
