import { loadLogo, type PreloadedLogo } from '@lib/menu-kit/imageLoader';
import { PRINTABLE_THEME_FAMILY_IDS } from './templateFamilies';
import { getPrintableGiftCertificateOverlayPath } from './giftCertificateArtwork';
import type { PrintableTemplateFamilyId } from './types';

export type PrintableThemeArtwork = {
    corner: PreloadedLogo | null;
    page: PreloadedLogo | null;
    rail: PreloadedLogo | null;
};

export type PrintableThemeArtworkPaths = {
    compact?: string;
    corner?: string;
    giftCertificate?: string;
    page?: string;
    rail?: string;
};

export type PrintableThemeArtworkFrame = {
    height: number;
    width: number;
    x: number;
    y: number;
};

export type PrintableThemeArtworkPlacement = {
    corner: PrintableThemeArtworkFrame;
    rail: PrintableThemeArtworkFrame;
};

const CRAFT_KITCHEN_CORNER_ASPECT_RATIO = 800 / 762;
const CRAFT_KITCHEN_RAIL_ASPECT_RATIO = 640 / 960;
const BOTANICAL_CORNER_ASPECT_RATIO = 1173 / 1341;
const BOTANICAL_RAIL_ASPECT_RATIO = 1024 / 1536;

const ARTWORK_PATHS: Partial<Record<PrintableTemplateFamilyId, PrintableThemeArtworkPaths>> = {
    'botanical-heritage': {
        corner: '/images/menu-card-export/botanical-corner-watercolor.png',
        page: '/images/printable-themes/botanical-heritage/editorial-page-background.png',
        rail: '/images/menu-card-export/botanical-rail-line-art.png',
    },
    'craft-kitchen': {
        corner: '/images/printable-themes/craft-kitchen/culinary-corner.png',
        page: '/images/printable-themes/craft-kitchen/editorial-page-background.png',
        rail: '/images/printable-themes/craft-kitchen/culinary-rail.png',
    },
    'ember-house': {
        page: '/images/printable-themes/ember-house/universal-background.png',
    },
    'coastal-table': {
        page: '/images/printable-themes/coastal-table/universal-background.png',
    },
    'sunday-table': {
        page: '/images/printable-themes/sunday-table/universal-background.png',
    },
    'counter-rush': {
        page: '/images/printable-themes/counter-rush/universal-background.png',
    },
    'roastery-ledger': {
        page: '/images/printable-themes/roastery-ledger/universal-background.png',
    },
    'patisserie-conservatory': {
        page: '/images/printable-themes/patisserie-conservatory/universal-background.png',
    },
    'gelateria-riviera': {
        page: '/images/printable-themes/gelateria-riviera/universal-background.png',
    },
    'salon-atelier': {
        compact: '/images/printable-themes/salon-atelier/compact-background.png',
        page: '/images/printable-themes/salon-atelier/editorial-page-background.png',
    },
    'petal-studio': {
        page: '/images/printable-themes/petal-studio/universal-background.png',
    },
    'pearl-veil': {
        page: '/images/printable-themes/pearl-veil/universal-background.png',
    },
    'terracotta-glow': {
        page: '/images/printable-themes/terracotta-glow/universal-background.png',
    },
    'glasshouse-beauty': {
        page: '/images/printable-themes/glasshouse-beauty/universal-background.png',
    },
    'ritual-sanctuary': {
        compact: '/images/printable-themes/ritual-sanctuary/compact-background.png',
        page: '/images/printable-themes/ritual-sanctuary/editorial-page-background.png',
    },
    'eucalyptus-retreat': {
        page: '/images/printable-themes/eucalyptus-retreat/universal-background.png',
    },
    'mineral-spring': {
        page: '/images/printable-themes/mineral-spring/universal-background.png',
    },
    'lotus-stillness': {
        page: '/images/printable-themes/lotus-stillness/universal-background.png',
    },
    'sunlit-ritual': {
        page: '/images/printable-themes/sunlit-ritual/universal-background.png',
    },
    'performance-circuit': {
        compact: '/images/printable-themes/performance-circuit/compact-background.png',
        page: '/images/printable-themes/performance-circuit/editorial-page-background.png',
    },
    'ink-vine': {
        page: '/images/printable-themes/ink-vine/editorial-page-background.png',
    },
    'midnight-gold': {
        page: '/images/printable-themes/midnight-gold/editorial-page-background.png',
    },
    'sunset-atelier': {
        page: '/images/printable-themes/sunset-atelier/editorial-page-background.png',
    },
    'rosewater-editorial': {
        page: '/images/printable-themes/rosewater-editorial/editorial-page-background.png',
    },
    'mineral-sanctuary': {
        page: '/images/printable-themes/mineral-sanctuary/editorial-page-background.png',
    },
    'noir-studio': {
        page: '/images/printable-themes/noir-studio/editorial-page-background.png',
    },
    'bombay-chronicle': {
        page: '/images/printable-themes/bombay-chronicle/editorial-page-background.png',
    },
    'indian-atelier': {
        page: '/images/printable-themes/indian-atelier/editorial-page-background.png',
    },
    'art-deco-garden': {
        page: '/images/printable-themes/art-deco-garden/editorial-page-background.png',
    },
    'japanese-night-luxe': {
        page: '/images/printable-themes/japanese-night-luxe/editorial-page-background.png',
    },
    'tea-salon-heritage': {
        page: '/images/printable-themes/tea-salon-heritage/editorial-page-background.png',
    },
    'lankan-block-print': {
        page: '/images/printable-themes/lankan-block-print/editorial-page-background.png',
    },
    'gallery-ledger': {
        page: '/images/printable-themes/gallery-ledger/editorial-page-background.png',
    },
    'vital-current': {
        page: '/images/printable-themes/vital-current/editorial-page-background.png',
    },
    'workshop-atlas': {
        page: '/images/printable-themes/workshop-atlas/editorial-page-background.png',
    },
    'neighbourhood-standard': {
        page: '/images/printable-themes/neighbourhood-standard/universal-background.png',
    },
    'field-notes': {
        page: '/images/printable-themes/field-notes/universal-background.png',
    },
    'boutique-window': {
        page: '/images/printable-themes/boutique-window/universal-background.png',
    },
    'market-label': {
        page: '/images/printable-themes/market-label/universal-background.png',
    },
    'civic-letterpress': {
        page: '/images/printable-themes/civic-letterpress/universal-background.png',
    },
    'modern-practice': {
        page: '/images/printable-themes/modern-practice/universal-background.png',
    },
    'studio-contact-sheet': {
        page: '/images/printable-themes/studio-contact-sheet/universal-background.png',
    },
    'maker-ledger': {
        page: '/images/printable-themes/maker-ledger/universal-background.png',
    },
    'clinical-calm': {
        page: '/images/printable-themes/clinical-calm/universal-background.png',
    },
    'mindful-motion': {
        page: '/images/printable-themes/mindful-motion/universal-background.png',
    },
    'hospitality-house': {
        page: '/images/printable-themes/hospitality-house/universal-background.png',
    },
    'future-workshop': {
        page: '/images/printable-themes/future-workshop/universal-background.png',
    },
};

const artworkCache = new Map<string, Promise<PrintableThemeArtwork>>();

export function getPrintableThemeArtworkPaths(templateFamilyId?: string | null) {
    if (!templateFamilyId || !PRINTABLE_THEME_FAMILY_IDS.includes(templateFamilyId as PrintableTemplateFamilyId)) {
        return undefined;
    }
    const familyId = templateFamilyId as PrintableTemplateFamilyId;
    return {
        ...ARTWORK_PATHS[familyId],
        giftCertificate: getPrintableGiftCertificateOverlayPath(familyId),
    };
}

export function loadPrintableThemeArtwork(templateFamilyId?: string | null): Promise<PrintableThemeArtwork> {
    const paths = getPrintableThemeArtworkPaths(templateFamilyId);
    if (!paths) return Promise.resolve({ corner: null, page: null, rail: null });
    const cacheKey = `${paths.compact || ''}|${paths.corner || ''}|${paths.page || ''}|${paths.rail || ''}`;
    const cached = artworkCache.get(cacheKey);
    if (cached) return cached;
    const promise = Promise.all([
        paths.corner ? loadLogo(paths.corner, 1_600) : Promise.resolve(null),
        paths.page ? loadLogo(paths.page, 1_600) : Promise.resolve(null),
        paths.rail ? loadLogo(paths.rail, 1_600) : Promise.resolve(null),
    ]).then(([corner, page, rail]) => ({ corner, page, rail }));
    artworkCache.set(cacheKey, promise);
    return promise;
}

export function getPrintableThemeArtworkPlacement(
    templateFamilyId: string | null | undefined,
    frame: PrintableThemeArtworkFrame,
): PrintableThemeArtworkPlacement {
    const isCraftKitchen = templateFamilyId === 'craft-kitchen';
    const cornerAspectRatio = isCraftKitchen
        ? CRAFT_KITCHEN_CORNER_ASPECT_RATIO
        : BOTANICAL_CORNER_ASPECT_RATIO;
    const railAspectRatio = isCraftKitchen
        ? CRAFT_KITCHEN_RAIL_ASPECT_RATIO
        : BOTANICAL_RAIL_ASPECT_RATIO;

    const cornerWidth = Math.min(
        frame.width * (isCraftKitchen ? 0.48 : 0.42),
        frame.height * (isCraftKitchen ? 0.40 : 0.32) * cornerAspectRatio,
    );
    const cornerHeight = cornerWidth / cornerAspectRatio;
    const railHeight = Math.min(
        frame.height * (isCraftKitchen ? 0.62 : 0.46),
        frame.width * (isCraftKitchen ? 0.51 : 0.345) / railAspectRatio,
    );
    const railWidth = railHeight * railAspectRatio;

    return {
        corner: {
            height: cornerHeight,
            width: cornerWidth,
            x: frame.x - cornerWidth * (isCraftKitchen ? 0.10 : 0),
            y: frame.y + frame.height - cornerHeight + cornerHeight * (isCraftKitchen ? 0.08 : 0),
        },
        rail: {
            height: railHeight,
            width: railWidth,
            x: frame.x + frame.width - railWidth * (isCraftKitchen ? 0.86 : 1),
            y: frame.y - railHeight * (isCraftKitchen ? 0.04 : 0),
        },
    };
}

export function drawPrintableThemeArtwork(
    ctx: CanvasRenderingContext2D,
    artwork: PrintableThemeArtwork,
    frame: PrintableThemeArtworkFrame,
    options: { cornerOpacity?: number; railOpacity?: number; templateFamilyId?: string | null } = {},
): void {
    const drawContained = (
        image: PreloadedLogo,
        box: { height: number; width: number; x: number; y: number },
        align: 'bottom-left' | 'top-right',
    ) => {
        const scale = Math.min(box.width / Math.max(1, image.width), box.height / Math.max(1, image.height));
        const width = image.width * scale;
        const height = image.height * scale;
        const x = align === 'top-right' ? box.x + box.width - width : box.x;
        const y = align === 'bottom-left' ? box.y + box.height - height : box.y;
        ctx.drawImage(image.element, x, y, width, height);
    };
    const placement = getPrintableThemeArtworkPlacement(options.templateFamilyId, frame);
    ctx.save();
    if (artwork.corner) {
        ctx.globalAlpha = options.cornerOpacity ?? 0.56;
        drawContained(artwork.corner, placement.corner, 'bottom-left');
    }
    if (artwork.rail) {
        ctx.globalAlpha = options.railOpacity ?? 0.40;
        drawContained(artwork.rail, placement.rail, 'top-right');
    }
    ctx.restore();
}
