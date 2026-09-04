import { jsPDF } from 'jspdf';
import type { MenuCardGeneratedArtifact, MenuCardExportSettings, MenuCardSafeOverrides } from '../models/exportTypes';
import type { MenuCardPrintSource, PrintCategory, PrintItem } from '../models/printModel';
import { getMenuCardTemplate } from '../templates/registry';
import { buildPrintSourceHash } from '../source/buildPrintSourceHash';
import { normalizeMenuCardLogoUrl } from '../source/buildPrintSource';
import { resolveMenuCardBusinessPrintProfile, type MenuCardBusinessPrintTone } from '../templates/businessPrintProfiles';
import { applySafeLayoutOverrides } from '../overrides/applySafeLayoutOverrides';
import { resolveMenuCardColumnCount } from '../layout/resolveColumnCount';
import { getPrintBox } from './renderPrintBoxes';
import { renderQr } from './renderQr';
import { createPrintableCategoryIconDataUrl } from './renderCategoryIcon';
import { buildArtifactFilename, buildPdfDocumentProperties, formatArtifactDate } from './artifactMetadata';
import {
    createMenuListLogoMarkDataUrl,
    getMenuListLogoMarkWidth,
    MENU_LIST_MENU_ATTRIBUTION_TEXT,
} from '../../menu-kit/platformAttribution';
import { resolveMenuListAttributionPolicy } from '../../platform/menuListBranding';
import { getPrintableThemeArtworkPaths } from '../../printable-asset-templates/themeArtwork';
import { resolvePrintableTemplateBrandTokens } from '../../printable-asset-templates/templateStyles';
import {
    collectUsedItemDecisionSymbolIds,
    getItemDecisionSymbolDefinition,
    type ItemDecisionSymbolId,
} from '../../menu/itemDecisionSymbols';

const logoDataUrlCache = new Map<string, string>();
const MAX_MENU_CARD_LOGO_CACHE_ENTRIES = 16;
export const MAX_MENU_CARD_LOGO_RASTER_DIMENSION = 2_048;
export const MAX_MENU_CARD_LOGO_RASTER_PIXELS = 4_194_304;
const MAX_MENU_CARD_EMBEDDED_LOGO_DATA_URL_LENGTH = 512_000;
const MAX_MENU_CARD_EMBEDDED_ARTWORK_DATA_URL_LENGTH = 4_500_000;
const MENU_CARD_QR_IMAGE_ALIAS = 'menulist-menu-qr';
const FULL_PAGE_THEME_INITIALS_MARK_RADIUS_RATIO = 0.48;
const FULL_PAGE_THEME_INITIALS_FONT_SIZE_RATIO = 0.78;
const READABLE_EDITORIAL_ITEM_FONT_SIZE = 17.2;
const READABLE_EDITORIAL_DESCRIPTION_FONT_SIZE = 11;
const STRUCTURED_EDITORIAL_ITEM_FONT_SIZE = 13.4;
const STRUCTURED_EDITORIAL_DESCRIPTION_FONT_SIZE = 9.2;
const PRINT_OPTION_SEGMENT_SIZE = 4;
const CATEGORY_TITLE_ICON_SIZE = 5.2;
const CATEGORY_TITLE_ICON_GAP = 1.6;
const MENU_CARD_BOTANICAL_CORNER_PATH = '/images/menu-card-export/botanical-corner-watercolor.png';
const MENU_CARD_BOTANICAL_RAIL_PATH = '/images/menu-card-export/botanical-rail-line-art.png';
const MENU_CARD_CRAFT_KITCHEN_CORNER_PATH = '/images/printable-themes/craft-kitchen/culinary-corner.png';
const MENU_CARD_CRAFT_KITCHEN_RAIL_PATH = '/images/printable-themes/craft-kitchen/culinary-rail.png';
const MENU_CARD_CRAFT_KITCHEN_PAGE_PATH = '/images/printable-themes/craft-kitchen/editorial-page-background.png';
const MENU_CARD_THEME_PAGE_PATHS: Record<string, string> = {
    'botanical-heritage': '/images/printable-themes/botanical-heritage/editorial-page-background.png',
    'craft-kitchen': MENU_CARD_CRAFT_KITCHEN_PAGE_PATH,
    'ember-house': '/images/printable-themes/ember-house/universal-background.png',
    'coastal-table': '/images/printable-themes/coastal-table/universal-background.png',
    'sunday-table': '/images/printable-themes/sunday-table/universal-background.png',
    'counter-rush': '/images/printable-themes/counter-rush/universal-background.png',
    'roastery-ledger': '/images/printable-themes/roastery-ledger/universal-background.png',
    'patisserie-conservatory': '/images/printable-themes/patisserie-conservatory/universal-background.png',
    'gelateria-riviera': '/images/printable-themes/gelateria-riviera/universal-background.png',
    'salon-atelier': '/images/printable-themes/salon-atelier/editorial-page-background.png',
    'petal-studio': '/images/printable-themes/petal-studio/universal-background.png',
    'pearl-veil': '/images/printable-themes/pearl-veil/universal-background.png',
    'terracotta-glow': '/images/printable-themes/terracotta-glow/universal-background.png',
    'glasshouse-beauty': '/images/printable-themes/glasshouse-beauty/universal-background.png',
    'ritual-sanctuary': '/images/printable-themes/ritual-sanctuary/editorial-page-background.png',
    'eucalyptus-retreat': '/images/printable-themes/eucalyptus-retreat/universal-background.png',
    'mineral-spring': '/images/printable-themes/mineral-spring/universal-background.png',
    'lotus-stillness': '/images/printable-themes/lotus-stillness/universal-background.png',
    'sunlit-ritual': '/images/printable-themes/sunlit-ritual/universal-background.png',
    'performance-circuit': '/images/printable-themes/performance-circuit/editorial-page-background.png',
    'ink-vine': '/images/printable-themes/ink-vine/editorial-page-background.png',
    'midnight-gold': '/images/printable-themes/midnight-gold/editorial-page-background.png',
    'sunset-atelier': '/images/printable-themes/sunset-atelier/editorial-page-background.png',
    'rosewater-editorial': '/images/printable-themes/rosewater-editorial/editorial-page-background.png',
    'mineral-sanctuary': '/images/printable-themes/mineral-sanctuary/editorial-page-background.png',
    'noir-studio': '/images/printable-themes/noir-studio/editorial-page-background.png',
    'bombay-chronicle': '/images/printable-themes/bombay-chronicle/editorial-page-background.png',
    'indian-atelier': '/images/printable-themes/indian-atelier/editorial-page-background.png',
    'art-deco-garden': '/images/printable-themes/art-deco-garden/editorial-page-background.png',
    'japanese-night-luxe': '/images/printable-themes/japanese-night-luxe/editorial-page-background.png',
    'tea-salon-heritage': '/images/printable-themes/tea-salon-heritage/editorial-page-background.png',
    'lankan-block-print': '/images/printable-themes/lankan-block-print/editorial-page-background.png',
    'gallery-ledger': '/images/printable-themes/gallery-ledger/editorial-page-background.png',
    'vital-current': '/images/printable-themes/vital-current/editorial-page-background.png',
    'workshop-atlas': '/images/printable-themes/workshop-atlas/editorial-page-background.png',
    'neighbourhood-standard': '/images/printable-themes/neighbourhood-standard/universal-background.png',
    'field-notes': '/images/printable-themes/field-notes/universal-background.png',
    'boutique-window': '/images/printable-themes/boutique-window/universal-background.png',
    'market-label': '/images/printable-themes/market-label/universal-background.png',
    'civic-letterpress': '/images/printable-themes/civic-letterpress/universal-background.png',
    'modern-practice': '/images/printable-themes/modern-practice/universal-background.png',
    'studio-contact-sheet': '/images/printable-themes/studio-contact-sheet/universal-background.png',
    'maker-ledger': '/images/printable-themes/maker-ledger/universal-background.png',
    'clinical-calm': '/images/printable-themes/clinical-calm/universal-background.png',
    'mindful-motion': '/images/printable-themes/mindful-motion/universal-background.png',
    'hospitality-house': '/images/printable-themes/hospitality-house/universal-background.png',
    'future-workshop': '/images/printable-themes/future-workshop/universal-background.png',
};
const FULL_PAGE_THEME_IDS = new Set(Object.keys(MENU_CARD_THEME_PAGE_PATHS));
const DARK_EDITORIAL_THEME_IDS = new Set([
    'midnight-gold',
    'sunset-atelier',
    'noir-studio',
    'japanese-night-luxe',
]);
const SANS_DISPLAY_THEME_IDS = new Set([
    'counter-rush',
    'performance-circuit',
    'vital-current',
    'workshop-atlas',
    'field-notes',
    'modern-practice',
    'studio-contact-sheet',
    'clinical-calm',
    'mindful-motion',
    'future-workshop',
    'glasshouse-beauty',
    'mineral-spring',
]);
const STRUCTURED_SERVICE_THEME_IDS = new Set([
    'gallery-ledger',
    'vital-current',
    'workshop-atlas',
    'neighbourhood-standard',
    'field-notes',
    'boutique-window',
    'market-label',
    'civic-letterpress',
    'modern-practice',
    'studio-contact-sheet',
    'maker-ledger',
    'clinical-calm',
    'mindful-motion',
    'hospitality-house',
    'future-workshop',
]);
const MENU_CARD_ARTWORK_PATHS = new Set([
    MENU_CARD_BOTANICAL_CORNER_PATH,
    MENU_CARD_BOTANICAL_RAIL_PATH,
    MENU_CARD_CRAFT_KITCHEN_CORNER_PATH,
    MENU_CARD_CRAFT_KITCHEN_RAIL_PATH,
    MENU_CARD_CRAFT_KITCHEN_PAGE_PATH,
    ...Object.values(MENU_CARD_THEME_PAGE_PATHS),
]);

export type MenuCardRenderOptions = {
    fallbackLogoDataUrl?: string;
    backgroundArtworkDataUrls?: {
        botanicalCorner?: string;
        botanicalRail?: string;
        craftKitchenPage?: string;
        themePage?: string;
    };
};

type MenuCardBackgroundArtwork = {
    botanicalCorner: string | null;
    botanicalRail: string | null;
    craftKitchenPage: string | null;
    themePage: string | null;
};

type RgbColor = [number, number, number];

type MenuCardVisualStyle = {
    bodyColor: RgbColor;
    paperColor: RgbColor;
    borderColor: RgbColor;
    accentColor: RgbColor;
    mutedColor: RgbColor;
    headerMode: 'plaque' | 'editorial' | 'compact-card';
    categoryMode: 'ribbon' | 'editorial' | 'boxed';
    pageBorder: 'single' | 'double';
    usePriceLeaders: boolean;
    itemTone: 'menu' | 'service' | 'product';
    printableThemeId?: string | null;
};

type FullPageThemeLayout = {
    margin: number;
    contentTop: number;
    coverContentTop?: number;
    bottomReserve: number;
    headerY?: number;
    footerPanelOpacity?: number;
    panel?: {
        x: number;
        y: number;
        widthInset: number;
        heightInset: number;
        color: RgbColor;
        opacity: number;
    };
};

const FULL_PAGE_PANEL_EDGE_INSET = 14;
const FULL_PAGE_PANEL_CONTENT_PADDING = 10;

const FULL_PAGE_THEME_LAYOUTS: Record<string, FullPageThemeLayout> = {
    'botanical-heritage': { margin: 28, contentTop: 44, bottomReserve: 58 },
    'craft-kitchen': { margin: 26, contentTop: 42, bottomReserve: 72 },
    'ember-house': {
        margin: 34,
        contentTop: 50,
        bottomReserve: 72,
        footerPanelOpacity: 0.92,
        panel: { x: 28, y: 20, widthInset: 56, heightInset: 62, color: [243, 232, 210], opacity: 0.82 },
    },
    'coastal-table': {
        margin: 34,
        contentTop: 48,
        coverContentTop: 26,
        bottomReserve: 72,
        footerPanelOpacity: 0.92,
        panel: { x: 28, y: 20, widthInset: 56, heightInset: 62, color: [247, 242, 232], opacity: 0.80 },
    },
    'sunday-table': {
        margin: 36,
        contentTop: 52,
        bottomReserve: 78,
        footerPanelOpacity: 0.92,
        panel: { x: 30, y: 22, widthInset: 60, heightInset: 66, color: [245, 232, 211], opacity: 0.82 },
    },
    'counter-rush': {
        margin: 38,
        contentTop: 50,
        bottomReserve: 76,
        footerPanelOpacity: 0.94,
        panel: { x: 32, y: 22, widthInset: 64, heightInset: 66, color: [245, 232, 205], opacity: 0.86 },
    },
    'roastery-ledger': {
        margin: 36,
        contentTop: 50,
        bottomReserve: 82,
        footerPanelOpacity: 0.92,
        panel: { x: 28, y: 18, widthInset: 56, heightInset: 56, color: [244, 235, 221], opacity: 0.78 },
    },
    'patisserie-conservatory': {
        margin: 42,
        contentTop: 58,
        bottomReserve: 108,
        footerPanelOpacity: 0.92,
        panel: { x: 34, y: 26, widthInset: 68, heightInset: 72, color: [245, 239, 227], opacity: 0.84 },
    },
    'gelateria-riviera': {
        margin: 44,
        contentTop: 52,
        bottomReserve: 94,
        footerPanelOpacity: 0.92,
        panel: { x: 36, y: 24, widthInset: 72, heightInset: 72, color: [247, 240, 222], opacity: 0.84 },
    },
    'salon-atelier': {
        margin: 34,
        contentTop: 48,
        bottomReserve: 80,
    },
    'petal-studio': {
        margin: 34,
        contentTop: 50,
        bottomReserve: 84,
    },
    'pearl-veil': {
        margin: 38,
        contentTop: 54,
        bottomReserve: 82,
    },
    'terracotta-glow': {
        margin: 36,
        contentTop: 52,
        bottomReserve: 106,
    },
    'glasshouse-beauty': {
        margin: 43,
        contentTop: 56,
        bottomReserve: 106,
    },
    'ritual-sanctuary': {
        margin: 40,
        contentTop: 54,
        bottomReserve: 104,
    },
    'eucalyptus-retreat': {
        margin: 38,
        contentTop: 54,
        bottomReserve: 112,
    },
    'mineral-spring': {
        margin: 42,
        contentTop: 58,
        bottomReserve: 94,
    },
    'lotus-stillness': {
        margin: 42,
        contentTop: 58,
        bottomReserve: 116,
    },
    'sunlit-ritual': {
        margin: 40,
        contentTop: 70,
        bottomReserve: 112,
        headerY: 40,
    },
    'performance-circuit': {
        margin: 36,
        contentTop: 50,
        bottomReserve: 106,
    },
    'ink-vine': {
        margin: 28,
        contentTop: 48,
        bottomReserve: 44,
        panel: { x: 22, y: 14, widthInset: 44, heightInset: 42, color: [255, 253, 248], opacity: 0.88 },
    },
    'midnight-gold': {
        margin: 26,
        contentTop: 42,
        coverContentTop: 24,
        bottomReserve: 38,
        panel: { x: 18, y: 8, widthInset: 36, heightInset: 38, color: [14, 9, 5], opacity: 0.78 },
    },
    'sunset-atelier': {
        margin: 26,
        contentTop: 42,
        bottomReserve: 40,
        panel: { x: 14, y: 32, widthInset: 28, heightInset: 66, color: [5, 57, 59], opacity: 0.52 },
    },
    'rosewater-editorial': {
        margin: 30,
        contentTop: 46,
        bottomReserve: 62,
        // A translucent paper field preserves dim-light contrast without reading
        // as a separate white card. The 12 mm side/top safe inset keeps the
        // continuation label, item names, descriptions, and prices off its edge.
        panel: { x: 18, y: 10, widthInset: 36, heightInset: 46, color: [247, 241, 236], opacity: 0.74 },
    },
    'mineral-sanctuary': {
        margin: 31,
        contentTop: 48,
        bottomReserve: 68,
        panel: { x: 18, y: 10, widthInset: 36, heightInset: 48, color: [241, 236, 226], opacity: 0.76 },
    },
    'noir-studio': {
        margin: 30,
        contentTop: 46,
        bottomReserve: 50,
        panel: { x: 22, y: 18, widthInset: 44, heightInset: 52, color: [16, 18, 21], opacity: 0.78 },
    },
    'bombay-chronicle': {
        margin: 30,
        contentTop: 52,
        bottomReserve: 48,
        panel: { x: 24, y: 14, widthInset: 48, heightInset: 44, color: [242, 226, 191], opacity: 0.78 },
    },
    'indian-atelier': {
        margin: 30,
        contentTop: 44,
        bottomReserve: 56,
        panel: { x: 24, y: 18, widthInset: 48, heightInset: 50, color: [247, 243, 234], opacity: 0.78 },
    },
    'art-deco-garden': {
        margin: 34,
        contentTop: 48,
        bottomReserve: 64,
        panel: { x: 28, y: 18, widthInset: 56, heightInset: 56, color: [245, 239, 227], opacity: 0.84 },
    },
    'japanese-night-luxe': {
        margin: 28,
        contentTop: 44,
        bottomReserve: 44,
        panel: { x: 20, y: 24, widthInset: 40, heightInset: 54, color: [10, 15, 20], opacity: 0.72 },
    },
    'tea-salon-heritage': {
        margin: 32,
        contentTop: 48,
        bottomReserve: 58,
        panel: { x: 26, y: 17, widthInset: 52, heightInset: 50, color: [244, 231, 207], opacity: 0.86 },
    },
    'lankan-block-print': {
        margin: 48,
        contentTop: 50,
        bottomReserve: 48,
        panel: { x: 42, y: 28, widthInset: 84, heightInset: 64, color: [240, 228, 200], opacity: 0.94 },
    },
    'gallery-ledger': {
        margin: 41,
        contentTop: 48,
        bottomReserve: 52,
    },
    'vital-current': {
        margin: 34,
        contentTop: 48,
        bottomReserve: 52,
        footerPanelOpacity: 0.86,
    },
    'workshop-atlas': {
        margin: 31,
        contentTop: 48,
        bottomReserve: 68,
        footerPanelOpacity: 0.86,
    },
    'neighbourhood-standard': {
        margin: 32,
        contentTop: 48,
        bottomReserve: 64,
        footerPanelOpacity: 0.90,
        panel: { x: 26, y: 18, widthInset: 52, heightInset: 54, color: [245, 234, 213], opacity: 0.80 },
    },
    'field-notes': {
        margin: 34,
        contentTop: 48,
        bottomReserve: 66,
        footerPanelOpacity: 0.90,
        panel: { x: 28, y: 18, widthInset: 56, heightInset: 56, color: [241, 231, 210], opacity: 0.80 },
    },
    'boutique-window': {
        margin: 37,
        contentTop: 52,
        bottomReserve: 70,
        footerPanelOpacity: 0.92,
        panel: { x: 31, y: 22, widthInset: 62, heightInset: 62, color: [247, 241, 231], opacity: 0.82 },
    },
    'market-label': {
        margin: 36,
        contentTop: 50,
        bottomReserve: 72,
        footerPanelOpacity: 0.92,
        panel: { x: 30, y: 22, widthInset: 60, heightInset: 64, color: [243, 231, 206], opacity: 0.84 },
    },
    'civic-letterpress': {
        margin: 36,
        contentTop: 50,
        bottomReserve: 62,
        footerPanelOpacity: 0.90,
        panel: { x: 30, y: 20, widthInset: 60, heightInset: 58, color: [243, 234, 215], opacity: 0.80 },
    },
    'modern-practice': {
        margin: 32,
        contentTop: 46,
        bottomReserve: 58,
        footerPanelOpacity: 0.88,
        panel: { x: 26, y: 18, widthInset: 52, heightInset: 54, color: [245, 244, 239], opacity: 0.76 },
    },
    'studio-contact-sheet': {
        margin: 38,
        contentTop: 50,
        bottomReserve: 68,
        footerPanelOpacity: 0.92,
        panel: { x: 32, y: 22, widthInset: 64, heightInset: 62, color: [245, 241, 231], opacity: 0.86 },
    },
    'maker-ledger': {
        margin: 36,
        contentTop: 50,
        bottomReserve: 72,
        footerPanelOpacity: 0.92,
        panel: { x: 30, y: 22, widthInset: 60, heightInset: 64, color: [242, 231, 212], opacity: 0.84 },
    },
    'clinical-calm': {
        margin: 32,
        contentTop: 46,
        bottomReserve: 58,
        footerPanelOpacity: 0.88,
        panel: { x: 26, y: 18, widthInset: 52, heightInset: 54, color: [245, 242, 233], opacity: 0.78 },
    },
    'mindful-motion': {
        margin: 34,
        contentTop: 48,
        bottomReserve: 64,
        footerPanelOpacity: 0.90,
        panel: { x: 28, y: 20, widthInset: 56, heightInset: 58, color: [245, 238, 227], opacity: 0.78 },
    },
    'hospitality-house': {
        margin: 36,
        contentTop: 50,
        bottomReserve: 70,
        footerPanelOpacity: 0.92,
        panel: { x: 30, y: 22, widthInset: 60, heightInset: 64, color: [244, 234, 217], opacity: 0.82 },
    },
    'future-workshop': {
        margin: 36,
        contentTop: 48,
        bottomReserve: 64,
        footerPanelOpacity: 0.90,
        panel: { x: 30, y: 20, widthInset: 60, heightInset: 58, color: [245, 242, 235], opacity: 0.82 },
    },
};

function isCraftKitchenStyle(style: MenuCardVisualStyle): boolean {
    return style.printableThemeId === 'craft-kitchen';
}

function isFullPageThemeStyle(style: MenuCardVisualStyle): boolean {
    return Boolean(style.printableThemeId && FULL_PAGE_THEME_IDS.has(style.printableThemeId));
}

function isDarkEditorialStyle(style: MenuCardVisualStyle): boolean {
    return Boolean(style.printableThemeId && DARK_EDITORIAL_THEME_IDS.has(style.printableThemeId));
}

function isReadableEditorialStyle(style: MenuCardVisualStyle): boolean {
    return isFullPageThemeStyle(style);
}

function usesSansDisplayStyle(style: MenuCardVisualStyle): boolean {
    return Boolean(style.printableThemeId && SANS_DISPLAY_THEME_IDS.has(style.printableThemeId));
}

function usesStructuredServiceLayout(style: MenuCardVisualStyle): boolean {
    return Boolean(style.printableThemeId && STRUCTURED_SERVICE_THEME_IDS.has(style.printableThemeId));
}

function getEditorialItemFontSize(style: MenuCardVisualStyle): number {
    return usesStructuredServiceLayout(style)
        ? STRUCTURED_EDITORIAL_ITEM_FONT_SIZE
        : READABLE_EDITORIAL_ITEM_FONT_SIZE;
}

function getEditorialDescriptionFontSize(style: MenuCardVisualStyle): number {
    return usesStructuredServiceLayout(style)
        ? STRUCTURED_EDITORIAL_DESCRIPTION_FONT_SIZE
        : READABLE_EDITORIAL_DESCRIPTION_FONT_SIZE;
}

function getEditorialNameLineHeight(style: MenuCardVisualStyle): number {
    return usesStructuredServiceLayout(style) ? 5.3 : 7.2;
}

function getEditorialDescriptionLineHeight(style: MenuCardVisualStyle): number {
    return usesStructuredServiceLayout(style) ? 3.8 : 4.8;
}

function getFullPageThemeLayout(style: MenuCardVisualStyle): FullPageThemeLayout | null {
    if (!style.printableThemeId) return null;
    return FULL_PAGE_THEME_LAYOUTS[style.printableThemeId] || null;
}

function getBalancedFullPageThemePanel(style: MenuCardVisualStyle): FullPageThemeLayout['panel'] | null {
    const panel = getFullPageThemeLayout(style)?.panel;
    if (!panel) return null;

    // The content veil uses one optical inset on the top, left, and right.
    // Preserve the theme's existing bottom clearance because that space owns
    // the footer and its dynamic decision-symbol legend.
    const bottomInset = Math.max(0, panel.heightInset - panel.y);
    return {
        ...panel,
        x: FULL_PAGE_PANEL_EDGE_INSET,
        y: FULL_PAGE_PANEL_EDGE_INSET,
        widthInset: FULL_PAGE_PANEL_EDGE_INSET * 2,
        heightInset: FULL_PAGE_PANEL_EDGE_INSET + bottomInset,
    };
}

function getFullPageThemeContentMargin(style: MenuCardVisualStyle): number | null {
    const layout = getFullPageThemeLayout(style);
    if (!layout) return null;
    return getBalancedFullPageThemePanel(style)
        ? FULL_PAGE_PANEL_EDGE_INSET + FULL_PAGE_PANEL_CONTENT_PADDING
        : layout.margin;
}

function getFullPageThemeContentTop(style: MenuCardVisualStyle): number {
    const layout = getFullPageThemeLayout(style);
    if (!layout) return 0;
    return getBalancedFullPageThemePanel(style)
        ? FULL_PAGE_PANEL_EDGE_INSET + FULL_PAGE_PANEL_CONTENT_PADDING
        : layout.contentTop;
}

function getReadableEditorialBodyColor(style: MenuCardVisualStyle): RgbColor {
    return style.bodyColor;
}

function hexToRgb(hex: string): [number, number, number] {
    const clean = (hex || '#2d2d2d').replace('#', '').trim();
    const expanded = /^[0-9a-fA-F]{3}$/.test(clean)
        ? clean.split('').map((char) => `${char}${char}`).join('')
        : clean;
    const value = /^[0-9a-fA-F]{6}$/.test(expanded) ? expanded : '2d2d2d';
    return [
        parseInt(value.slice(0, 2), 16),
        parseInt(value.slice(2, 4), 16),
        parseInt(value.slice(4, 6), 16),
    ];
}

function rgbToCss([red, green, blue]: RgbColor): string {
    return `rgb(${red}, ${green}, ${blue})`;
}

function brightness([r, g, b]: RgbColor): number {
    return (r * 299 + g * 587 + b * 114) / 1000;
}

function textColorForFill(color: RgbColor): RgbColor {
    return brightness(color) > 150 ? [30, 30, 30] : [255, 255, 255];
}

function readableAccentColor(color: RgbColor): RgbColor {
    if (brightness(color) <= 205) return color;
    return [
        Math.round(color[0] * 0.55),
        Math.round(color[1] * 0.55),
        Math.round(color[2] * 0.55),
    ];
}

function blendRgb(color: RgbColor, background: RgbColor, ratio: number): RgbColor {
    return [
        Math.round(color[0] * ratio + background[0] * (1 - ratio)),
        Math.round(color[1] * ratio + background[1] * (1 - ratio)),
        Math.round(color[2] * ratio + background[2] * (1 - ratio)),
    ];
}

function setFillRgb(doc: jsPDF, color: RgbColor) {
    doc.setFillColor(color[0], color[1], color[2]);
}

function setDrawRgb(doc: jsPDF, color: RgbColor) {
    doc.setDrawColor(color[0], color[1], color[2]);
}

function setTextRgb(doc: jsPDF, color: RgbColor) {
    doc.setTextColor(color[0], color[1], color[2]);
}

function getVisualStyle(templateFamily: string, accentRgb: RgbColor, businessTone: MenuCardBusinessPrintTone): MenuCardVisualStyle {
    const readableAccent = readableAccentColor(accentRgb);

    if (businessTone === 'product-catalog') {
        return {
            bodyColor: [30, 30, 30],
            paperColor: templateFamily === 'compact' ? [250, 247, 238] : [250, 249, 245],
            borderColor: blendRgb(readableAccent, [78, 82, 72], 0.3),
            accentColor: readableAccent,
            mutedColor: [84, 86, 78],
            headerMode: 'compact-card',
            categoryMode: 'boxed',
            pageBorder: 'single',
            usePriceLeaders: true,
            itemTone: 'product',
        };
    }

    if (businessTone === 'service-list' || businessTone === 'wellness-list' || businessTone === 'professional-guide') {
        const isProfessional = businessTone === 'professional-guide';
        const isWellness = businessTone === 'wellness-list';
        return {
            bodyColor: [30, 30, 30],
            paperColor: isWellness ? [248, 251, 248] : [250, 249, 246],
            borderColor: blendRgb(readableAccent, isProfessional ? [70, 72, 78] : [74, 86, 78], 0.28),
            accentColor: readableAccent,
            mutedColor: isProfessional ? [78, 80, 86] : [76, 86, 80],
            headerMode: templateFamily === 'compact' ? 'compact-card' : 'editorial',
            categoryMode: templateFamily === 'compact' ? 'boxed' : 'editorial',
            pageBorder: 'single',
            usePriceLeaders: templateFamily === 'compact',
            itemTone: 'service',
        };
    }

    if (templateFamily === 'premium') {
        return {
            bodyColor: [30, 30, 30],
            paperColor: [251, 248, 241],
            borderColor: blendRgb(readableAccent, [70, 58, 46], 0.35),
            accentColor: readableAccent,
            mutedColor: [92, 82, 72],
            headerMode: 'editorial',
            categoryMode: 'editorial',
            pageBorder: 'single',
            usePriceLeaders: false,
            itemTone: 'menu',
        };
    }

    if (templateFamily === 'compact') {
        return {
            bodyColor: [30, 30, 30],
            paperColor: [250, 246, 233],
            borderColor: blendRgb(readableAccent, [98, 76, 34], 0.32),
            accentColor: readableAccent,
            mutedColor: [88, 72, 42],
            headerMode: 'compact-card',
            categoryMode: 'boxed',
            pageBorder: 'single',
            usePriceLeaders: true,
            itemTone: 'menu',
        };
    }

    return {
        bodyColor: [30, 30, 30],
        paperColor: [252, 250, 244],
        borderColor: blendRgb(readableAccent, [58, 52, 44], 0.4),
        accentColor: readableAccent,
        mutedColor: [86, 78, 66],
        headerMode: 'plaque',
        categoryMode: 'ribbon',
        pageBorder: 'double',
        usePriceLeaders: true,
        itemTone: 'menu',
    };
}

export function isMenuCardLogoRasterSafe(width: unknown, height: unknown): boolean {
    return (
        typeof width === 'number'
        && typeof height === 'number'
        && Number.isInteger(width)
        && Number.isInteger(height)
        && width > 0
        && height > 0
        && width <= MAX_MENU_CARD_LOGO_RASTER_DIMENSION
        && height <= MAX_MENU_CARD_LOGO_RASTER_DIMENSION
        && width * height <= MAX_MENU_CARD_LOGO_RASTER_PIXELS
    );
}

function cacheLogoDataUrl(url: string, dataUrl: string): void {
    logoDataUrlCache.delete(url);
    while (logoDataUrlCache.size >= MAX_MENU_CARD_LOGO_CACHE_ENTRIES) {
        const oldestKey = logoDataUrlCache.keys().next().value;
        if (typeof oldestKey !== 'string') break;
        logoDataUrlCache.delete(oldestKey);
    }
    logoDataUrlCache.set(url, dataUrl);
}

async function imageUrlToPngDataUrl(rawUrl?: string): Promise<string | null> {
    const url = normalizeMenuCardLogoUrl(rawUrl);
    if (!url || typeof window === 'undefined' || typeof Image === 'undefined' || typeof document === 'undefined') {
        return null;
    }
    if (logoDataUrlCache.has(url)) {
        return logoDataUrlCache.get(url) || null;
    }

    return new Promise((resolve) => {
        let settled = false;
        let image: HTMLImageElement;
        const timeout = window.setTimeout(() => {
            image.src = '';
            finish(null);
        }, 5000);
        const finish = (dataUrl: string | null) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeout);
            if (dataUrl) cacheLogoDataUrl(url, dataUrl);
            resolve(dataUrl);
        };
        image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const width = image.naturalWidth || image.width;
                const height = image.naturalHeight || image.height;
                if (!isMenuCardLogoRasterSafe(width, height)) {
                    finish(null);
                    return;
                }
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext('2d');
                if (!context) {
                    finish(null);
                    return;
                }
                context.drawImage(image, 0, 0, width, height);
                finish(canvas.toDataURL('image/png'));
            } catch {
                finish(null);
            }
        };
        image.onerror = () => finish(null);
        image.src = url;
    });
}

async function builtInArtworkToPngDataUrl(path: string): Promise<string | null> {
    if (
        !MENU_CARD_ARTWORK_PATHS.has(path)
        || typeof window === 'undefined'
    ) {
        return null;
    }
    return imageUrlToPngDataUrl(new URL(path, window.location.origin).toString());
}

function safeEmbeddedArtworkDataUrl(value: unknown): string | null {
    return typeof value === 'string'
        && value.startsWith('data:image/png;base64,')
        && value.length <= MAX_MENU_CARD_EMBEDDED_ARTWORK_DATA_URL_LENGTH
        ? value
        : null;
}

function getContainedImageSize(
    sourceWidth: number,
    sourceHeight: number,
    maxWidth: number,
    maxHeight: number,
): { width: number; height: number } {
    if (!sourceWidth || !sourceHeight) return { width: maxWidth, height: maxHeight };
    const ratio = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
    return {
        width: sourceWidth * ratio,
        height: sourceHeight * ratio,
    };
}

function isAscii(value: string): boolean {
    return /^[\x20-\x7E]+$/.test(value);
}

function readableCurrencyPrefix(currency: string, currencyCode?: string): string {
    const token = String(currency || '').trim();
    const code = String(currencyCode || '').trim().toUpperCase();
    const pdfSafeToken = (() => {
        if (token === '₹' || code === 'INR') return 'Rs';
        if (token === '€') return 'EUR';
        if (token === '£') return 'GBP';
        if (token === '¥') return 'JPY';
        if (token === '₩') return 'KRW';
        if (token === '₺') return 'TRY';
        if (token === '₽') return 'RUB';
        if (token === '₫') return 'VND';
        if (token && isAscii(token)) return token;
        return code;
    })();

    if (!pdfSafeToken) return '';
    return /^[A-Z]{3}$/.test(pdfSafeToken) || pdfSafeToken === 'Rs'
        ? `${pdfSafeToken} `
        : pdfSafeToken;
}

function formatPrice(price: string | undefined, currency: string, currencyCode?: string): string {
    if (!price) return '';
    const rawPrice = String(price).trim();
    if (!rawPrice) return '';

    const rawCurrencyToken = String(currency || '').trim();
    const rawCurrencyCode = String(currencyCode || '').trim();
    const currencyPrefix = readableCurrencyPrefix(rawCurrencyToken, rawCurrencyCode);
    const currencyMarkers = [rawCurrencyToken, rawCurrencyCode, currencyPrefix.trim()]
        .filter(Boolean)
        .map((marker) => marker.toLowerCase());
    const hasCurrency = currencyMarkers.some((marker) => rawPrice.toLowerCase().includes(marker));
    const numericCandidate = rawPrice
        .replace(/,/g, '')
        .replace(rawCurrencyToken, '')
        .replace(rawCurrencyCode, '')
        .replace(currencyPrefix.trim(), '')
        .trim();

    if (/^-?\d+(\.\d+)?$/.test(numericCandidate)) {
        const numericPrice = Number(numericCandidate);
        const formattedNumber = Number.isInteger(numericPrice)
            ? numericPrice.toFixed(0)
            : numericPrice.toFixed(2);
        return currencyPrefix ? `${currencyPrefix}${formattedNumber}` : formattedNumber;
    }

    if (hasCurrency || !currencyPrefix) return rawPrice;
    if (!/\d/.test(rawPrice)) return rawPrice;
    return `${currencyPrefix}${rawPrice}`;
}

function getFormat(settings: MenuCardExportSettings): 'a4' | 'a5' | 'letter' {
    return settings.paperSize === 'letter' ? 'letter' : settings.paperSize;
}

function getHeaderSubtitle(source: MenuCardPrintSource): string {
    const profile = resolveMenuCardBusinessPrintProfile({
        businessCategory: source.business.businessCategory,
        catalogKind: source.business.catalogKind,
        offeringKind: source.business.offeringKind,
    });
    const title = source.menu.title || profile.fallbackTitle;
    return title.trim().toLowerCase() === 'menu' && profile.documentLabel !== 'Menu'
        ? profile.documentLabel
        : title;
}

export function getMenuCardBusinessInitials(name: unknown): string {
    if (typeof name !== 'string') return 'M';
    const tokens = name
        .trim()
        .split(/\s+/)
        .map((token) => token.replace(/^[&+.,'’"“”(){}\[\]<>/\\|:;!?_-]+|[&+.,'’"“”(){}\[\]<>/\\|:;!?_-]+$/g, ''))
        .filter(Boolean);
    if (tokens.length === 0) return 'M';
    if (tokens.length === 1) return Array.from(tokens[0]).slice(0, 2).join('').toUpperCase();
    return `${Array.from(tokens[0])[0]}${Array.from(tokens[tokens.length - 1])[0]}`.toUpperCase();
}

function getConciseQrLabel(label: string): string {
    return label.replace(/\bcurrent\b/gi, '').replace(/\s{2,}/g, ' ').trim();
}

export function getCenteredTrackedTextStartX(params: {
    centerX: number;
    charSpace: number;
    text: string;
    textWidth: number;
}): number {
    const characterGaps = Math.max(0, Array.from(params.text).length - 1);
    const trackingWidth = characterGaps * Math.max(0, params.charSpace);
    return params.centerX - (Math.max(0, params.textWidth) + trackingWidth) / 2;
}

function drawCenteredTrackedText(
    doc: jsPDF,
    text: string,
    centerX: number,
    y: number,
    charSpace: number,
) {
    // jsPDF's standard-font center alignment does not include PDF character
    // spacing in its width calculation. Position the tracked label from its
    // complete rendered width so it shares the logo/name center axis.
    const startX = getCenteredTrackedTextStartX({
        centerX,
        charSpace,
        text,
        textWidth: doc.getTextWidth(text),
    });
    doc.text(text, startX, y, { charSpace });
}

function getFontSizes(settings: MenuCardExportSettings) {
    if (settings.density === 'compact') {
        return { item: 9, description: 7.4, category: 10 };
    }
    if (settings.density === 'comfortable') {
        return { item: 10.6, description: 8.2, category: 12.5 };
    }
    return { item: 9.8, description: 7.8, category: 11.5 };
}

function drawPageBase(doc: jsPDF, style: MenuCardVisualStyle, pageWidth: number, pageHeight: number) {
    setFillRgb(doc, style.paperColor);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    if (isCraftKitchenStyle(style)) {
        drawCraftKitchenPaperTexture(doc, style, pageWidth, pageHeight);
        return;
    }

    if (isFullPageThemeStyle(style)) {
        return;
    }

    setDrawRgb(doc, style.borderColor);
    doc.setLineWidth(style.pageBorder === 'double' ? 0.32 : 0.24);
    doc.rect(9, 9, pageWidth - 18, pageHeight - 18, 'S');

    if (style.pageBorder === 'double') {
        doc.setLineWidth(0.12);
        doc.rect(11.2, 11.2, pageWidth - 22.4, pageHeight - 22.4, 'S');
    }

    setDrawRgb(doc, style.accentColor);
    doc.setLineWidth(0.65);
    doc.line(pageWidth / 2 - 13, 9, pageWidth / 2 + 13, 9);
}

function drawCraftKitchenPaperTexture(
    doc: jsPDF,
    style: MenuCardVisualStyle,
    pageWidth: number,
    pageHeight: number,
) {
    const lightWash = blendRgb([255, 246, 232], style.paperColor, 0.035);
    const warmWash = blendRgb(style.accentColor, style.paperColor, 0.006);
    const paperFibres = blendRgb(style.borderColor, style.paperColor, 0.045);
    const washes = [
        [0.07, 0.04, 0.10, 0.022, lightWash], [0.25, 0.07, 0.08, 0.030, warmWash],
        [0.48, 0.04, 0.12, 0.018, lightWash], [0.73, 0.10, 0.09, 0.026, warmWash],
        [0.91, 0.06, 0.07, 0.020, lightWash], [0.13, 0.22, 0.06, 0.025, warmWash],
        [0.37, 0.28, 0.11, 0.020, lightWash], [0.62, 0.23, 0.08, 0.030, warmWash],
        [0.86, 0.31, 0.10, 0.018, lightWash], [0.05, 0.43, 0.08, 0.024, lightWash],
        [0.28, 0.48, 0.12, 0.019, warmWash], [0.53, 0.42, 0.07, 0.026, lightWash],
        [0.77, 0.51, 0.11, 0.022, warmWash], [0.94, 0.45, 0.06, 0.030, lightWash],
        [0.12, 0.63, 0.11, 0.019, warmWash], [0.34, 0.69, 0.08, 0.027, lightWash],
        [0.58, 0.61, 0.12, 0.021, lightWash], [0.81, 0.72, 0.08, 0.024, warmWash],
        [0.96, 0.66, 0.06, 0.019, lightWash], [0.08, 0.84, 0.07, 0.028, lightWash],
        [0.29, 0.89, 0.11, 0.020, warmWash], [0.55, 0.82, 0.08, 0.026, lightWash],
        [0.76, 0.93, 0.12, 0.018, warmWash], [0.94, 0.87, 0.07, 0.024, lightWash],
    ] as const;

    washes.forEach(([xRatio, yRatio, widthRatio, heightRatio, color]) => {
        setFillRgb(doc, color);
        doc.ellipse(
            pageWidth * xRatio,
            pageHeight * yRatio,
            pageWidth * widthRatio,
            pageHeight * heightRatio,
            'F',
        );
    });

    let seed = 1_903;
    const next = () => {
        seed = (seed * 48_271) % 2_147_483_647;
        return seed / 2_147_483_647;
    };
    setFillRgb(doc, paperFibres);
    Array.from({ length: 72 }).forEach(() => {
        const radius = 0.12 + next() * 0.42;
        doc.ellipse(next() * pageWidth, next() * pageHeight, radius, radius * (0.6 + next() * 0.8), 'F');
    });
}

function shouldUseEditorialBackground(
    templateFamily: string,
    businessTone: MenuCardBusinessPrintTone,
    settings: MenuCardExportSettings,
): boolean {
    if (settings.preset === 'staff_reference') return false;
    return templateFamily === 'premium'
        || businessTone === 'service-list'
        || businessTone === 'wellness-list';
}

function addArtworkImage(
    doc: jsPDF,
    dataUrl: string | null,
    x: number,
    y: number,
    width: number,
    height: number,
    align: 'bottom-left' | 'top-right',
    opacity = 1,
) {
    if (!dataUrl) return;
    try {
        const properties = doc.getImageProperties(dataUrl);
        const naturalWidth = Math.max(1, Number(properties.width) || width);
        const naturalHeight = Math.max(1, Number(properties.height) || height);
        const scale = Math.min(width / naturalWidth, height / naturalHeight);
        const fittedWidth = naturalWidth * scale;
        const fittedHeight = naturalHeight * scale;
        const fittedX = align === 'top-right' ? x + width - fittedWidth : x;
        const fittedY = align === 'bottom-left' ? y + height - fittedHeight : y;
        doc.saveGraphicsState();
        doc.setGState(doc.GState({ opacity }));
        doc.addImage(dataUrl, 'PNG', fittedX, fittedY, fittedWidth, fittedHeight, undefined, 'FAST');
        doc.restoreGraphicsState();
    } catch {
        // Decorative artwork is optional; content must remain exportable if it cannot be decoded.
    }
}

function addFullBleedArtwork(
    doc: jsPDF,
    dataUrl: string | null,
    pageWidth: number,
    pageHeight: number,
) {
    if (!dataUrl) return;
    try {
        const properties = doc.getImageProperties(dataUrl);
        const naturalWidth = Math.max(1, Number(properties.width) || pageWidth);
        const naturalHeight = Math.max(1, Number(properties.height) || pageHeight);
        const scale = Math.max(pageWidth / naturalWidth, pageHeight / naturalHeight);
        const width = naturalWidth * scale;
        const height = naturalHeight * scale;
        doc.addImage(
            dataUrl,
            'PNG',
            (pageWidth - width) / 2,
            (pageHeight - height) / 2,
            width,
            height,
            undefined,
            'FAST',
        );
    } catch {
        // The flat paper colour remains a safe print fallback if the background cannot be decoded.
    }
}

function drawContentPageBackground(
    doc: jsPDF,
    artwork: MenuCardBackgroundArtwork,
    pageWidth: number,
    pageHeight: number,
    contentPageIndex: number,
    style: MenuCardVisualStyle,
) {
    const variant = (contentPageIndex - 1) % 3;

    if (artwork.themePage) {
        addFullBleedArtwork(doc, artwork.themePage, pageWidth, pageHeight);
        const panel = getBalancedFullPageThemePanel(style);
        if (panel) {
            doc.saveGraphicsState();
            doc.setGState(doc.GState({ opacity: panel.opacity }));
            setFillRgb(doc, panel.color);
            doc.roundedRect(
                panel.x,
                panel.y,
                pageWidth - panel.widthInset,
                pageHeight - panel.heightInset,
                2,
                2,
                'F',
            );
            doc.restoreGraphicsState();
        }
        return;
    }

    if (isCraftKitchenStyle(style)) {
        if (artwork.craftKitchenPage) {
            addFullBleedArtwork(doc, artwork.craftKitchenPage, pageWidth, pageHeight);
            return;
        }
        const bottom = pageHeight - 5;
        if (variant === 0) {
            addArtworkImage(doc, artwork.botanicalCorner, pageWidth - 88, bottom - 58, 92, 58, 'bottom-left', 0.18);
            addArtworkImage(doc, artwork.botanicalRail, -5, bottom - 45, 31, 43, 'bottom-left', 0.12);
        } else if (variant === 1) {
            addArtworkImage(doc, artwork.botanicalCorner, -7, bottom - 55, 87, 55, 'bottom-left', 0.16);
            addArtworkImage(doc, artwork.botanicalRail, pageWidth - 27, bottom - 49, 30, 47, 'top-right', 0.11);
        } else {
            addArtworkImage(doc, artwork.botanicalCorner, pageWidth - 75, bottom - 52, 79, 52, 'bottom-left', 0.17);
            addArtworkImage(doc, artwork.botanicalRail, 2, bottom - 43, 29, 41, 'bottom-left', 0.10);
        }
        drawCraftKitchenEdgeMark(doc, style, pageWidth, pageHeight, variant);
        return;
    }

    if (variant === 0) {
        addArtworkImage(doc, artwork.botanicalCorner, -5, 10, 34, 34, 'bottom-left');
        addArtworkImage(doc, artwork.botanicalRail, pageWidth - 33, pageHeight - 82, 31, 50, 'top-right');
        return;
    }

    if (variant === 1) {
        addArtworkImage(doc, artwork.botanicalRail, pageWidth - 33, 28, 31, 50, 'top-right');
        addArtworkImage(doc, artwork.botanicalCorner, -5, pageHeight - 72, 34, 34, 'bottom-left');
        return;
    }

    addArtworkImage(doc, artwork.botanicalCorner, -5, 10, 34, 34, 'bottom-left');
    addArtworkImage(doc, artwork.botanicalRail, pageWidth - 33, pageHeight - 88, 31, 50, 'top-right');
}

const FULL_PAGE_LEGEND_FOOTER_HEIGHT = 23;
const FULL_PAGE_LEGEND_FOOTER_CONTENT_RECLAIM = 6;
const FULL_PAGE_LEGEND_MIN_BOTTOM_RESERVE = 32;

function drawFullPageThemeFooterPanel(
    doc: jsPDF,
    pageWidth: number,
    pageHeight: number,
    style: MenuCardVisualStyle,
    hasDecisionSymbolLegend: boolean,
) {
    const opacity = getFullPageThemeLayout(style)?.footerPanelOpacity
        ?? (isDarkEditorialStyle(style) ? 0.92 : undefined);
    if (!opacity) return;

    const panelHeight = hasDecisionSymbolLegend ? FULL_PAGE_LEGEND_FOOTER_HEIGHT : 19;
    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity }));
    setFillRgb(doc, style.paperColor);
    doc.roundedRect(8, pageHeight - panelHeight - 4, pageWidth - 16, panelHeight, 2, 2, 'F');
    doc.restoreGraphicsState();
}

function drawDarkThemeHeaderPanel(
    doc: jsPDF,
    pageWidth: number,
    style: MenuCardVisualStyle,
    panelHeight = 30,
) {
    if (!isDarkEditorialStyle(style)) return;

    const horizontalInset = Math.min(40, pageWidth * 0.18);
    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity: 0.92 }));
    setFillRgb(doc, style.paperColor);
    doc.roundedRect(
        horizontalInset,
        8,
        pageWidth - horizontalInset * 2,
        panelHeight,
        2,
        2,
        'F',
    );
    doc.restoreGraphicsState();
}

function drawCoverPageBackgroundArtwork(
    doc: jsPDF,
    artwork: MenuCardBackgroundArtwork,
    pageWidth: number,
    pageHeight: number,
    style: MenuCardVisualStyle,
) {
    if (artwork.themePage) {
        addFullBleedArtwork(doc, artwork.themePage, pageWidth, pageHeight);
        return;
    }
    if (isCraftKitchenStyle(style)) {
        if (artwork.craftKitchenPage) {
            addFullBleedArtwork(doc, artwork.craftKitchenPage, pageWidth, pageHeight);
            return;
        }
        addArtworkImage(doc, artwork.botanicalCorner, -8, pageHeight - 92, 116, 86, 'bottom-left', 0.22);
        addArtworkImage(doc, artwork.botanicalRail, pageWidth - 38, 3, 40, 66, 'top-right', 0.14);
        return;
    }
    addArtworkImage(doc, artwork.botanicalRail, pageWidth - 50, 15, 48, 72, 'top-right');
    addArtworkImage(doc, artwork.botanicalCorner, -5, pageHeight - 108, 55, 52, 'bottom-left');
}

function drawCraftKitchenEdgeMark(
    doc: jsPDF,
    style: MenuCardVisualStyle,
    pageWidth: number,
    pageHeight: number,
    variant: number,
) {
    setDrawRgb(doc, blendRgb(style.mutedColor, style.paperColor, 0.42));
    doc.setLineWidth(0.18);
    const x = variant === 1 ? 10 : pageWidth - 10;
    const direction = variant === 1 ? 1 : -1;
    const startY = 82 + variant * 13;
    doc.line(x, startY, x + direction * 0.8, startY + 12);
    doc.line(x + direction * 0.3, startY + 15, x + direction * 1.1, startY + 29);
    doc.line(x + direction * 0.4, startY + 32, x + direction * 0.7, startY + 40);
}

function getItemLayout(
    doc: jsPDF,
    item: PrintItem,
    width: number,
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    style: MenuCardVisualStyle,
) {
    const sizes = getFontSizes(settings);
    const price = formatDisplayPrice(item.price, source, style);
    const isReadableEditorial = isReadableEditorialStyle(style);
    const nameFont = isReadableEditorial
        ? 'helvetica'
        : style.categoryMode === 'editorial' && style.itemTone !== 'product' ? 'times' : 'helvetica';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isReadableEditorial ? getEditorialItemFontSize(style) : sizes.item);
    const priceWidth = price
        ? Math.min(width * 0.45, Math.max(18, doc.getTextWidth(price) + 4))
        : 0;
    const decisionSymbolWidth = getPrintDecisionSymbolClusterWidth(item.decisionSymbols || []);
    const decisionSymbolGap = decisionSymbolWidth > 0 ? 2 : 0;
    const nameWidth = Math.max(
        width - priceWidth - 4 - decisionSymbolWidth - decisionSymbolGap,
        width * 0.42,
    );
    doc.setFont(nameFont, 'bold');
    const maxNameLines = settings.density === 'compact' ? 2 : 3;
    const nameLines = (doc.splitTextToSize(item.name, nameWidth) as string[]).slice(0, maxNameLines);
    return { decisionSymbolGap, decisionSymbolWidth, nameLines, nameWidth, price, priceWidth };
}

function formatDisplayPrice(
    rawPrice: string | undefined,
    source: MenuCardPrintSource,
    style: MenuCardVisualStyle,
): string {
    const formatted = formatPrice(rawPrice, source.menu.currency, source.menu.currencyCode);
    if (!isCraftKitchenStyle(style) || source.menu.currencyCode?.toUpperCase() !== 'INR') {
        return formatted;
    }
    return formatted.replace(/^Rs\s*/i, '');
}

const ITEM_DESCRIPTION_GAP_SCALE = 0.75;

function getBaseItemDescriptionGap(settings: MenuCardExportSettings, style: MenuCardVisualStyle): number {
    if (usesStructuredServiceLayout(style)) return settings.density === 'compact' ? 0.7 : 0.9;
    if (isReadableEditorialStyle(style)) return settings.density === 'compact' ? 0.9 : 1.2;
    if (settings.density === 'compact') return 0.7;
    if (settings.density === 'comfortable') return 1.1;
    return 0.9;
}

function getItemDescriptionGap(settings: MenuCardExportSettings, style: MenuCardVisualStyle): number {
    return getBaseItemDescriptionGap(settings, style) * ITEM_DESCRIPTION_GAP_SCALE;
}

function getItemEndGap(
    settings: MenuCardExportSettings,
    style: MenuCardVisualStyle,
    hasSupportingContent: boolean,
): number {
    const descriptionGap = getBaseItemDescriptionGap(settings, style);
    // The margin is measured after a complete description line box, while the
    // name-to-description gap begins after a much taller item-name line box.
    // Compensate for that typography so the visible whitespace after supporting
    // copy stays clearly larger without creating an oversized break between items.
    if (hasSupportingContent) return descriptionGap * 7;
    if (isReadableEditorialStyle(style)) return settings.density === 'compact' ? 4 : 5.2;
    return Math.max(descriptionGap * 1.5, settings.density === 'compact' ? 1.8 : 2.8);
}

function getItemSupportingText(
    item: PrintItem,
    settings: MenuCardExportSettings,
): string {
    return settings.includeDescriptions ? item.description || '' : '';
}

const PRINT_DECISION_SYMBOL_SIZE = 3.4;
const PRINT_DECISION_SYMBOL_GAP = 0.9;
const FULL_PAGE_LEGEND_BASELINE_SAFE_GAP = 5.2;

function getPrintDecisionSymbolWidth(id: ItemDecisionSymbolId, size = PRINT_DECISION_SYMBOL_SIZE): number {
    const definition = getItemDecisionSymbolDefinition(id);
    if (definition.kind === 'spice') {
        const marks = definition.spiceMarks || 1;
        return Math.max(size, marks * size * 0.82);
    }
    if (id === 'unisex') return size * 1.12;
    return size;
}

function getPrintDecisionSymbolClusterWidth(
    symbols: readonly ItemDecisionSymbolId[],
    size = PRINT_DECISION_SYMBOL_SIZE,
): number {
    if (symbols.length === 0) return 0;
    return symbols.reduce((total, symbol) => total + getPrintDecisionSymbolWidth(symbol, size), 0)
        + Math.max(0, symbols.length - 1) * PRINT_DECISION_SYMBOL_GAP;
}

function getPrintDecisionSymbolColor(
    id: ItemDecisionSymbolId,
    style: MenuCardVisualStyle,
): RgbColor {
    const definition = getItemDecisionSymbolDefinition(id);
    if (definition.semanticColor === 'green') {
        return isDarkEditorialStyle(style) ? [74, 222, 128] : [21, 128, 61];
    }
    if (definition.semanticColor === 'red') {
        return isDarkEditorialStyle(style) ? [248, 113, 113] : [185, 28, 28];
    }
    return style.accentColor;
}

function drawPrintLucideVeganSymbol(
    doc: jsPDF,
    x: number,
    top: number,
    size: number,
): void {
    const scale = size / 24;
    const px = (value: number) => x + value * scale;
    const py = (value: number) => top + value * scale;

    doc.setLineCap('round');
    doc.setLineJoin('round');
    doc.setLineWidth(Math.max(0.24, size * (2.15 / 24)));
    doc.path([
        { op: 'm', c: [px(16), py(8)] },
        { op: 'c', c: [px(20), py(8), px(22), py(6), px(22), py(2)] },
        { op: 'c', c: [px(20), py(2), px(16), py(4), px(16), py(8)] },
        { op: 'm', c: [px(17.41), py(3.59)] },
        { op: 'c', c: [px(13.112), py(0.825), px(7.422), py(1.746), px(4.215), py(5.724)] },
        { op: 'c', c: [px(1.008), py(9.702), px(1.316), py(15.458), px(4.929), py(19.071)] },
        { op: 'c', c: [px(8.542), py(22.684), px(14.298), py(22.992), px(18.276), py(19.785)] },
        { op: 'c', c: [px(22.254), py(16.578), px(23.175), py(10.888), px(20.41), py(6.59)] },
        { op: 'm', c: [px(2), py(2)] },
        { op: 'c', c: [px(8.11), py(6.874), px(11.767), py(14.188), px(12), py(22)] },
        { op: 'c', c: [px(12.9), py(15.18), px(13.5), py(12.5), px(16), py(8)] },
    ]);
    // Commit the green outline before another symbol changes the active colour.
    doc.stroke();
    doc.setLineCap('butt');
    doc.setLineJoin('miter');
}

function drawPrintLucideWheatSymbol(
    doc: jsPDF,
    x: number,
    top: number,
    size: number,
): void {
    const scale = size / 24;
    const px = (value: number) => x + value * scale;
    const py = (value: number) => top + value * scale;

    doc.setLineCap('round');
    doc.setLineJoin('round');
    doc.setLineWidth(Math.max(0.24, size * (2.15 / 24)));
    doc.path([
        { op: 'm', c: [px(2), py(22)] }, { op: 'l', c: [px(16), py(8)] },
        { op: 'm', c: [px(3.47), py(12.53)] }, { op: 'l', c: [px(5), py(11)] }, { op: 'l', c: [px(6.53), py(12.53)] },
        { op: 'c', c: [px(7.89), py(13.896), px(7.89), py(16.104), px(6.53), py(17.47)] },
        { op: 'l', c: [px(5), py(19)] }, { op: 'l', c: [px(3.47), py(17.47)] },
        { op: 'c', c: [px(2.11), py(16.104), px(2.11), py(13.896), px(3.47), py(12.53)] },
        { op: 'm', c: [px(7.47), py(8.53)] }, { op: 'l', c: [px(9), py(7)] }, { op: 'l', c: [px(10.53), py(8.53)] },
        { op: 'c', c: [px(11.89), py(9.896), px(11.89), py(12.104), px(10.53), py(13.47)] },
        { op: 'l', c: [px(9), py(15)] }, { op: 'l', c: [px(7.47), py(13.47)] },
        { op: 'c', c: [px(6.11), py(12.104), px(6.11), py(9.896), px(7.47), py(8.53)] },
        { op: 'm', c: [px(11.47), py(4.53)] }, { op: 'l', c: [px(13), py(3)] }, { op: 'l', c: [px(14.53), py(4.53)] },
        { op: 'c', c: [px(15.89), py(5.896), px(15.89), py(8.104), px(14.53), py(9.47)] },
        { op: 'l', c: [px(13), py(11)] }, { op: 'l', c: [px(11.47), py(9.47)] },
        { op: 'c', c: [px(10.11), py(8.104), px(10.11), py(5.896), px(11.47), py(4.53)] },
        { op: 'm', c: [px(20), py(2)] }, { op: 'l', c: [px(22), py(2)] }, { op: 'l', c: [px(22), py(4)] },
        { op: 'c', c: [px(22), py(6.209), px(20.209), py(8), px(18), py(8)] },
        { op: 'l', c: [px(16), py(8)] }, { op: 'l', c: [px(16), py(6)] },
        { op: 'c', c: [px(16), py(3.791), px(17.791), py(2), px(20), py(2)] },
        { op: 'm', c: [px(11.47), py(17.47)] }, { op: 'l', c: [px(13), py(19)] }, { op: 'l', c: [px(11.47), py(20.53)] },
        { op: 'c', c: [px(10.104), py(21.89), px(7.896), py(21.89), px(6.53), py(20.53)] },
        { op: 'l', c: [px(5), py(19)] }, { op: 'l', c: [px(6.53), py(17.47)] },
        { op: 'c', c: [px(7.896), py(16.11), px(10.104), py(16.11), px(11.47), py(17.47)] },
        { op: 'm', c: [px(15.47), py(13.47)] }, { op: 'l', c: [px(17), py(15)] }, { op: 'l', c: [px(15.47), py(16.53)] },
        { op: 'c', c: [px(14.104), py(17.89), px(11.896), py(17.89), px(10.53), py(16.53)] },
        { op: 'l', c: [px(9), py(15)] }, { op: 'l', c: [px(10.53), py(13.47)] },
        { op: 'c', c: [px(11.896), py(12.11), px(14.104), py(12.11), px(15.47), py(13.47)] },
        { op: 'm', c: [px(19.47), py(9.47)] }, { op: 'l', c: [px(21), py(11)] }, { op: 'l', c: [px(19.47), py(12.53)] },
        { op: 'c', c: [px(18.104), py(13.89), px(15.896), py(13.89), px(14.53), py(12.53)] },
        { op: 'l', c: [px(13), py(11)] }, { op: 'l', c: [px(14.53), py(9.47)] },
        { op: 'c', c: [px(15.896), py(8.11), px(18.104), py(8.11), px(19.47), py(9.47)] },
    ]);
    // Commit the neutral/theme outline before another symbol changes the active colour.
    doc.stroke();
    doc.setLineCap('butt');
    doc.setLineJoin('miter');
}

function drawPrintGameIconChilliSymbol(
    doc: jsPDF,
    x: number,
    top: number,
    size: number,
): void {
    const iconSize = size * 0.82;
    const left = x;
    const iconTop = top + (size - iconSize) / 2;
    const scale = iconSize / 512;
    const px = (value: number) => left + value * scale;
    const py = (value: number) => iconTop + value * scale;

    // Game Icons `GiChiliPepper`, supplied through react-icons. This is the
    // same long chilli silhouette used by the browser/share-card renderer.
    doc.path([
        { op: 'm', c: [px(446.738), py(28.814)] },
        { op: 'c', c: [px(421.621), py(42.501), px(397.849), py(71.494), px(384.781), py(100.623)] },
        { op: 'c', c: [px(376.963), py(97.73), px(368.105), py(96.005), px(359.268), py(96.078)] },
        { op: 'c', c: [px(344.538), py(96.199), px(329.883), py(101.305), px(320.26), py(114.246)] },
        { op: 'c', c: [px(321.146), py(114.251), px(322.034), py(114.264), px(322.926), py(114.296)] },
        { op: 'c', c: [px(335.146), py(114.739), px(347.884), py(117.706), px(360.23), py(122.398)] },
        { op: 'c', c: [px(383.21), py(131.132), px(405.437), py(145.684), px(418.52), py(164.228)] },
        { op: 'c', c: [px(431.243), py(133.625), px(417.69), py(119.025), px(400.951), py(108.798)] },
        { op: 'c', c: [px(412.684), py(83.18), px(435.74), py(55.308), px(455.351), py(44.621)] },
        { op: 'l', c: [px(446.738), py(28.814)] },
        { op: 'm', c: [px(319.824), py(132.261)] },
        { op: 'c', c: [px(317.521), py(132.243), px(315.219), py(132.359), px(312.93), py(132.611)] },
        { op: 'c', c: [px(301.205), py(133.933), px(293.076), py(138.316), px(288.244), py(147.088)] },
        { op: 'c', c: [px(242.93), py(229.355), px(247.854), py(264.325), px(235.152), py(303.265)] },
        { op: 'c', c: [px(228.802), py(322.735), px(217.805), py(342.357), px(194.83), py(366.475)] },
        { op: 'c', c: [px(171.855), py(390.591), px(136.876), py(419.595), px(81.451), py(459.482)] },
        { op: 'c', c: [px(68.708), py(468.653), px(60.685), py(476.282), px(57.421), py(480.872)] },
        { op: 'c', c: [px(56.735), py(481.839), px(56.925), py(481.7), px(56.648), py(482.289)] },
        { op: 'c', c: [px(58.748), py(482.754), px(62.866), py(483.551), px(70.182), py(482.998)] },
        { op: 'c', c: [px(80.105), py(482.247), px(93.882), py(479.735), px(110.712), py(475.326)] },
        { op: 'c', c: [px(196.183), py(452.934), px(275.191), py(399.773), px(330.83), py(343.009)] },
        { op: 'c', c: [px(358.65), py(314.628), px(380.624), py(285.351), px(394.691), py(258.961)] },
        { op: 'c', c: [px(408.759), py(232.571), px(414.531), py(209.089), px(411.93), py(193.334)] },
        { op: 'c', c: [px(408.657), py(173.517), px(382.635), py(150.172), px(353.834), py(139.224)] },
        { op: 'c', c: [px(343.034), py(135.119), px(332.02), py(132.707), px(322.242), py(132.316)] },
        { op: 'c', c: [px(321.436), py(132.284), px(320.63), py(132.265), px(319.824), py(132.261)] },
        { op: 'l', c: [px(319.824), py(132.261)] },
        { op: 'm', c: [px(321.801), py(150.074)] },
        { op: 'c', c: [px(323.526), py(150.134), px(325.186), py(150.629), px(326.768), py(151.607)] },
        { op: 'c', c: [px(303.823), py(191.247), px(279.858), py(232.707), px(266.298), py(290.045)] },
        { op: 'c', c: [px(243.348), py(278.056), px(291.984), py(149.038), px(321.801), py(150.074)] },
        { op: 'l', c: [px(321.801), py(150.074)] },
    ]);
    // jsPDF's deprecated `path(..., 'F')` style argument can defer the fill
    // until a later drawing operation has changed the active colour. Commit
    // this silhouette immediately so the shared semantic red is preserved.
    doc.fill();
}

function drawPrintMarsSymbol(
    doc: jsPDF,
    x: number,
    top: number,
    size: number,
): void {
    doc.circle(x + size * 0.38, top + size * 0.62, size * 0.25, 'S');
    doc.line(x + size * 0.56, top + size * 0.44, x + size * 0.88, top + size * 0.12);
    doc.line(x + size * 0.66, top + size * 0.12, x + size * 0.88, top + size * 0.12);
    doc.line(x + size * 0.88, top + size * 0.12, x + size * 0.88, top + size * 0.34);
}

function drawPrintVenusSymbol(
    doc: jsPDF,
    x: number,
    top: number,
    size: number,
): void {
    doc.circle(x + size * 0.5, top + size * 0.35, size * 0.25, 'S');
    doc.line(x + size * 0.5, top + size * 0.6, x + size * 0.5, top + size * 0.93);
    doc.line(x + size * 0.32, top + size * 0.78, x + size * 0.68, top + size * 0.78);
}

function drawPrintUnisexSymbol(
    doc: jsPDF,
    x: number,
    top: number,
    size: number,
): void {
    const centerX = x + size * 0.5;
    doc.circle(centerX, top + size * 0.47, size * 0.23, 'S');
    doc.line(centerX + size * 0.16, top + size * 0.31, x + size * 0.9, top + size * 0.08);
    doc.line(x + size * 0.71, top + size * 0.08, x + size * 0.9, top + size * 0.08);
    doc.line(x + size * 0.9, top + size * 0.08, x + size * 0.9, top + size * 0.27);
    doc.line(centerX, top + size * 0.7, centerX, top + size * 0.98);
    doc.line(x + size * 0.34, top + size * 0.84, x + size * 0.66, top + size * 0.84);
}

function drawPrintPersonSymbol(
    doc: jsPDF,
    id: ItemDecisionSymbolId,
    x: number,
    top: number,
    size: number,
): void {
    const centerX = x + size * 0.5;
    doc.circle(centerX, top + size * 0.18, size * 0.12, 'F');
    doc.setLineCap('round');

    if (id === 'kids') {
        doc.line(centerX, top + size * 0.34, centerX, top + size * 0.68);
        doc.line(centerX, top + size * 0.43, x + size * 0.16, top + size * 0.2);
        doc.line(centerX, top + size * 0.43, x + size * 0.84, top + size * 0.2);
        doc.line(centerX, top + size * 0.68, x + size * 0.27, top + size * 0.95);
        doc.line(centerX, top + size * 0.68, x + size * 0.73, top + size * 0.95);
        doc.setLineCap('butt');
        return;
    }

    if (id === 'seniors') {
        doc.line(centerX, top + size * 0.34, x + size * 0.42, top + size * 0.67);
        doc.line(x + size * 0.42, top + size * 0.67, x + size * 0.27, top + size * 0.94);
        doc.line(x + size * 0.42, top + size * 0.67, x + size * 0.61, top + size * 0.94);
        doc.line(x + size * 0.46, top + size * 0.44, x + size * 0.75, top + size * 0.61);
        doc.line(x + size * 0.75, top + size * 0.61, x + size * 0.83, top + size * 0.95);
        doc.setLineCap('butt');
        return;
    }

    doc.line(centerX, top + size * 0.34, centerX, top + size * 0.68);
    doc.line(x + size * 0.21, top + size * 0.5, x + size * 0.79, top + size * 0.5);
    doc.line(centerX, top + size * 0.68, x + size * 0.29, top + size * 0.96);
    doc.line(centerX, top + size * 0.68, x + size * 0.71, top + size * 0.96);
    doc.setLineCap('butt');
}

function drawPrintAudienceSymbol(
    doc: jsPDF,
    id: ItemDecisionSymbolId,
    x: number,
    top: number,
    size: number,
): void {
    if (id === 'for-men') {
        drawPrintMarsSymbol(doc, x, top, size);
        return;
    }
    if (id === 'for-women') {
        drawPrintVenusSymbol(doc, x, top, size);
        return;
    }
    if (id === 'unisex') {
        drawPrintUnisexSymbol(doc, x, top, size);
        return;
    }
    drawPrintPersonSymbol(doc, id, x, top, size);
}

function drawPrintDecisionSymbol(
    doc: jsPDF,
    id: ItemDecisionSymbolId,
    x: number,
    centerY: number,
    style: MenuCardVisualStyle,
    size = PRINT_DECISION_SYMBOL_SIZE,
): number {
    const definition = getItemDecisionSymbolDefinition(id);
    const color = getPrintDecisionSymbolColor(id, style);
    const width = getPrintDecisionSymbolWidth(id, size);
    const top = centerY - size / 2;
    setDrawRgb(doc, color);
    setFillRgb(doc, color);
    doc.setLineWidth(Math.max(0.22, size * 0.085));

    if (definition.kind === 'dietary-dot') {
        doc.roundedRect(x, top, size, size, size * 0.12, size * 0.12, 'S');
        doc.circle(x + size / 2, centerY, size * 0.21, 'F');
        return width;
    }

    if (definition.kind === 'leaf') {
        drawPrintLucideVeganSymbol(doc, x, top, size);
        return width;
    }

    if (definition.kind === 'gluten-free') {
        drawPrintLucideWheatSymbol(doc, x, top, size);
        return width;
    }

    if (definition.kind === 'spice') {
        const marks = definition.spiceMarks || 1;
        const markWidth = width / marks;
        for (let index = 0; index < marks; index += 1) {
            drawPrintGameIconChilliSymbol(doc, x + index * markWidth, top, size);
        }
        return width;
    }

    drawPrintAudienceSymbol(doc, id, x, top, size);
    return width;
}

function drawPrintDecisionSymbolCluster(
    doc: jsPDF,
    symbols: readonly ItemDecisionSymbolId[],
    x: number,
    centerY: number,
    style: MenuCardVisualStyle,
    size = PRINT_DECISION_SYMBOL_SIZE,
): number {
    let cursorX = x;
    symbols.forEach((symbol, index) => {
        cursorX += drawPrintDecisionSymbol(doc, symbol, cursorX, centerY, style, size);
        if (index < symbols.length - 1) cursorX += PRINT_DECISION_SYMBOL_GAP;
    });
    return cursorX - x;
}

function getMenuDecisionSymbolLegend(source: MenuCardPrintSource): ItemDecisionSymbolId[] {
    return collectUsedItemDecisionSymbolIds(
        source.menu.categories.flatMap((category) => category.items),
    );
}

function drawPrintDecisionSymbolLegend(
    doc: jsPDF,
    symbols: readonly ItemDecisionSymbolId[],
    x: number,
    y: number,
    maxWidth: number,
    style: MenuCardVisualStyle,
): number {
    if (symbols.length === 0) return 0;
    const size = 2.7;
    const rowHeight = 3.8;
    let cursorX = x;
    let cursorY = y;
    let rows = 1;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.6);
    setTextRgb(doc, isDarkEditorialStyle(style) ? style.mutedColor : style.bodyColor);

    symbols.forEach((symbol) => {
        const definition = getItemDecisionSymbolDefinition(symbol);
        const markWidth = getPrintDecisionSymbolWidth(symbol, size);
        const entryWidth = markWidth + 1.2 + doc.getTextWidth(definition.label) + 4.2;
        if (cursorX > x && cursorX + entryWidth > x + maxWidth) {
            cursorX = x;
            cursorY += rowHeight;
            rows += 1;
        }
        drawPrintDecisionSymbol(doc, symbol, cursorX, cursorY - 0.8, style, size);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.6);
        setTextRgb(doc, isDarkEditorialStyle(style) ? style.mutedColor : style.bodyColor);
        doc.text(definition.label, cursorX + markWidth + 1.2, cursorY);
        cursorX += entryWidth;
    });
    return rows * rowHeight;
}

export function expandPrintOptionSegments(categories: PrintCategory[]): PrintCategory[] {
    return categories.map((category) => ({
        ...category,
        items: category.items.flatMap((item) => {
            if (item.attributes.length <= PRINT_OPTION_SEGMENT_SIZE) return [item];
            const segments: PrintItem[] = [];
            for (let offset = 0; offset < item.attributes.length; offset += PRINT_OPTION_SEGMENT_SIZE) {
                const segmentIndex = offset / PRINT_OPTION_SEGMENT_SIZE;
                segments.push({
                    ...item,
                    id: segmentIndex === 0 ? item.id : `${item.id}--options-${segmentIndex + 1}`,
                    name: segmentIndex === 0 ? item.name : `${item.name} (options continued)`,
                    price: segmentIndex === 0 ? item.price : undefined,
                    description: segmentIndex === 0 ? item.description : undefined,
                    decisionSymbols: segmentIndex === 0 ? item.decisionSymbols : [],
                    tags: segmentIndex === 0 ? item.tags : [],
                    attributes: item.attributes.slice(offset, offset + PRINT_OPTION_SEGMENT_SIZE),
                });
            }
            return segments;
        }),
    }));
}

type PrintAttributeLayout = {
    lines: string[];
    price: string;
    rowHeight: number;
};

function getPrintAttributeFontSize(
    settings: MenuCardExportSettings,
    style: MenuCardVisualStyle,
): number {
    if (usesStructuredServiceLayout(style)) return 8.8;
    if (isReadableEditorialStyle(style)) return 10;
    return Math.max(8, getFontSizes(settings).description);
}

function getPrintAttributeLineHeight(
    settings: MenuCardExportSettings,
    style: MenuCardVisualStyle,
): number {
    return getPrintAttributeFontSize(settings, style) * 0.352778 * 1.28;
}

function getPrintAttributeLayouts(
    doc: jsPDF,
    item: PrintItem,
    width: number,
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    style: MenuCardVisualStyle,
): PrintAttributeLayout[] {
    const fontSize = getPrintAttributeFontSize(settings, style);
    const lineHeight = getPrintAttributeLineHeight(settings, style);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    return item.attributes.map((attribute) => {
        const price = formatDisplayPrice(attribute.price, source, style);
        const priceWidth = price ? doc.getTextWidth(price) : 0;
        const nameWidth = Math.max(18, width - priceWidth - (price ? 5 : 0));
        const lines = doc.splitTextToSize(attribute.name, nameWidth) as string[];
        return {
            lines: lines.length > 0 ? lines : [attribute.name],
            price,
            rowHeight: Math.max(1, lines.length) * lineHeight + 0.8,
        };
    });
}

function itemHeight(
    doc: jsPDF,
    item: PrintItem,
    width: number,
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    style: MenuCardVisualStyle,
): number {
    const layout = getItemLayout(doc, item, width, source, settings, style);
    const isReadableEditorial = isReadableEditorialStyle(style);
    const nameLineHeight = isReadableEditorial ? getEditorialNameLineHeight(style) : settings.density === 'compact' ? 3.7 : settings.density === 'comfortable' ? 4.8 : 4.2;
    const desc = getItemSupportingText(item, settings);
    const maxDescriptionLines = settings.density === 'compact' ? 2 : 4;
    doc.setFont(isReadableEditorial ? 'helvetica' : style.categoryMode === 'editorial' && style.itemTone !== 'product' ? 'times' : 'helvetica', isReadableEditorial || style.itemTone === 'service' ? 'normal' : 'italic');
    doc.setFontSize(isReadableEditorial ? getEditorialDescriptionFontSize(style) : getFontSizes(settings).description);
    const descLines = desc
        ? Math.min((doc.splitTextToSize(desc, width - 4) as string[]).length, maxDescriptionLines)
        : 0;
    const attributeLayouts = getPrintAttributeLayouts(doc, item, width, source, settings, style);
    const hasSupportingContent = Boolean(desc || attributeLayouts.length > 0);
    const postNameGap = hasSupportingContent ? getItemDescriptionGap(settings, style) : 0;
    return Math.max(1, layout.nameLines.length) * nameLineHeight
        + postNameGap
        + descLines * (isReadableEditorial ? getEditorialDescriptionLineHeight(style) : 3.3)
        + attributeLayouts.reduce((sum, attribute) => sum + attribute.rowHeight, 0)
        + getItemEndGap(settings, style, hasSupportingContent);
}

function drawLogoMark(
    doc: jsPDF,
    source: MenuCardPrintSource,
    logoDataUrl: string | null,
    x: number,
    y: number,
    boxSize: number,
    style: MenuCardVisualStyle,
) {
    if (logoDataUrl) {
        try {
            const imageProperties = doc.getImageProperties(logoDataUrl);
            const size = getContainedImageSize(imageProperties.width, imageProperties.height, boxSize, boxSize);
            doc.addImage(
                logoDataUrl,
                'PNG',
                x + (boxSize - size.width) / 2,
                y + (boxSize - size.height) / 2,
                size.width,
                size.height,
            );
            return;
        } catch {
            // Fall through to the initial mark.
        }
    }

    const centerX = x + boxSize / 2;
    const centerY = y + boxSize / 2;
    const initials = getMenuCardBusinessInitials(source.business.name);
    if (isFullPageThemeStyle(style)) {
        setFillRgb(doc, style.accentColor);
        doc.circle(centerX, centerY, boxSize * FULL_PAGE_THEME_INITIALS_MARK_RADIUS_RATIO, 'F');
        setTextRgb(doc, textColorForFill(style.accentColor));
        doc.setFont(usesSansDisplayStyle(style) ? 'helvetica' : 'times', 'bold');
        doc.setFontSize(Math.max(14, boxSize * FULL_PAGE_THEME_INITIALS_FONT_SIZE_RATIO));
        doc.text(initials, centerX, centerY + boxSize * 0.105, { align: 'center' });
        return;
    }

    setTextRgb(doc, style.accentColor);
    doc.setFont('times', 'normal');
    doc.setFontSize(Math.max(16, boxSize * 0.58));
    doc.text(initials.charAt(0), centerX, centerY + boxSize * 0.17, { align: 'center' });
}

function drawPdfMenuListAttribution(
    doc: jsPDF,
    pageWidth: number,
    y: number,
    color: RgbColor,
    activePlanType?: string | null,
) {
    if (!resolveMenuListAttributionPolicy({ activePlanType }).showAttribution) {
        return;
    }

    const text = MENU_LIST_MENU_ATTRIBUTION_TEXT;
    const logoHeight = 3;
    const logoWidth = getMenuListLogoMarkWidth(logoHeight);
    const gap = 1.4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const textWidth = doc.getTextWidth(text);
    const startX = pageWidth / 2 - (logoWidth + gap + textWidth) / 2;

    try {
        const logo = createMenuListLogoMarkDataUrl();
        doc.addImage(logo.dataUrl, 'PNG', startX, y - logoHeight + 0.6, logoWidth, logoHeight);
        setTextRgb(doc, color);
        doc.text(text, startX + logoWidth + gap, y);
    } catch {
        setTextRgb(doc, color);
        doc.text(text, pageWidth / 2, y, { align: 'center' });
    }
}

function drawHeader(
    doc: jsPDF,
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    pageWidth: number,
    logoDataUrl: string | null,
    style: MenuCardVisualStyle,
): number {
    const hasContact = settings.includeContactBlock && !!(source.business.address || source.business.phone);
    const hasLogo = !!logoDataUrl;
    const headerHeight = style.headerMode === 'compact-card'
        ? (hasContact ? 46 : 36)
        : hasLogo
            ? (hasContact ? 60 : 50)
            : (hasContact ? 48 : 40);

    drawDarkThemeHeaderPanel(doc, pageWidth, style, hasLogo ? 44 : 30);

    if (style.headerMode === 'editorial') {
        if (hasLogo) {
            drawLogoMark(doc, source, logoDataUrl, pageWidth / 2 - 8, 14, 16, style);
        }
        const titleY = hasLogo ? 34 : 24;
        setTextRgb(doc, style.accentColor);
        doc.setFont(usesSansDisplayStyle(style) ? 'helvetica' : 'times', 'bold');
        doc.setFontSize(settings.preset === 'whatsapp' ? 18 : 22);
        doc.text(source.business.name, pageWidth / 2, titleY, { align: 'center', maxWidth: pageWidth - 44 });
        doc.setFont(usesSansDisplayStyle(style) ? 'helvetica' : 'times', usesSansDisplayStyle(style) ? 'normal' : 'italic');
        doc.setFontSize(10);
        setTextRgb(doc, style.mutedColor);
        doc.text(getHeaderSubtitle(source), pageWidth / 2, titleY + 7, { align: 'center' });
        setDrawRgb(doc, style.accentColor);
        doc.setLineWidth(0.28);
        doc.line(22, titleY + 11, pageWidth - 22, titleY + 11);
    } else if (style.headerMode === 'compact-card') {
        const cardX = 16;
        const cardY = 15;
        const cardH = hasContact ? 26 : 20;
        setFillRgb(doc, blendRgb(style.accentColor, style.paperColor, 0.08));
        setDrawRgb(doc, style.borderColor);
        doc.roundedRect(cardX, cardY, pageWidth - cardX * 2, cardH, 1.8, 1.8, 'FD');
        if (hasLogo) drawLogoMark(doc, source, logoDataUrl, cardX + 4, cardY + 3.5, 13, style);
        const textX = hasLogo ? cardX + 22 : cardX + 7;
        setTextRgb(doc, style.accentColor);
        doc.setFont('times', 'bold');
        doc.setFontSize(15);
        doc.text(source.business.name, textX, cardY + 9, { maxWidth: pageWidth - textX - cardX - 6 });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        setTextRgb(doc, style.mutedColor);
        doc.text(getHeaderSubtitle(source).toUpperCase(), textX, cardY + 15);
    } else {
        if (hasLogo) drawLogoMark(doc, source, logoDataUrl, pageWidth / 2 - 7.5, 13.5, 15, style);
        const titleY = hasLogo ? 35 : 24;
        doc.setFont('times', 'bold');
        doc.setFontSize(settings.preset === 'whatsapp' ? 17 : 21);
        setTextRgb(doc, style.accentColor);
        doc.text(source.business.name, pageWidth / 2, titleY, { align: 'center', maxWidth: pageWidth - 52 });

        setTextRgb(doc, style.mutedColor);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const subtitleY = titleY + 7;
        const subtitle = getHeaderSubtitle(source).toUpperCase();
        doc.text(subtitle, pageWidth / 2, subtitleY, { align: 'center' });
        const subtitleWidth = Math.min(46, doc.getTextWidth(subtitle) + 9);
        setDrawRgb(doc, style.borderColor);
        doc.setLineWidth(0.18);
        doc.line(24, subtitleY - 1.1, pageWidth / 2 - subtitleWidth / 2, subtitleY - 1.1);
        doc.line(pageWidth / 2 + subtitleWidth / 2, subtitleY - 1.1, pageWidth - 24, subtitleY - 1.1);
    }

    if (hasContact) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        setTextRgb(doc, style.mutedColor);
        const contact = [source.business.address, source.business.phone].filter(Boolean).join('  |  ');
        doc.text(contact, pageWidth / 2, headerHeight - 7, { align: 'center', maxWidth: pageWidth - 28 });
    }

    return headerHeight + 4;
}

function drawContinuationHeader(
    doc: jsPDF,
    source: MenuCardPrintSource,
    pageWidth: number,
    style: MenuCardVisualStyle,
): number {
    if (isReadableEditorialStyle(style)) {
        drawDarkThemeHeaderPanel(doc, pageWidth, style);
        const contentWidth = pageWidth - 52;
        const governedHeaderY = getFullPageThemeLayout(style)?.headerY || 22;
        const firstNameBaseline = Math.max(16, governedHeaderY - 6);
        doc.setFont(usesSansDisplayStyle(style) ? 'helvetica' : 'times', 'bold');
        doc.setFontSize(usesStructuredServiceLayout(style) || usesSansDisplayStyle(style) ? 17.2 : 18.5);
        const businessNameLines = (doc.splitTextToSize(source.business.name, contentWidth) as string[]).slice(0, 2);
        setTextRgb(doc, style.accentColor);
        businessNameLines.forEach((line, index) => {
            doc.text(line, pageWidth / 2, firstNameBaseline + index * 7.2, { align: 'center' });
        });

        const labelY = firstNameBaseline + Math.max(0, businessNameLines.length - 1) * 7.2 + 8;
        setTextRgb(doc, style.mutedColor);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        drawCenteredTrackedText(doc, getHeaderSubtitle(source).toUpperCase(), pageWidth / 2, labelY, 1.05);

        const ruleY = labelY + 6;
        setDrawRgb(doc, style.borderColor);
        doc.setLineWidth(0.38);
        doc.line(18, ruleY, pageWidth - 18, ruleY);
        doc.setLineWidth(0.12);
        doc.line(24, ruleY + 1.6, pageWidth - 24, ruleY + 1.6);
        return ruleY + 12;
    }

    const y = 20;
    setFillRgb(doc, blendRgb(style.accentColor, style.paperColor, 0.045));
    doc.roundedRect(13, 13, pageWidth - 26, 14, 1.2, 1.2, 'F');

    setTextRgb(doc, style.accentColor);
    doc.setFont('times', 'normal');
    doc.setFontSize(11.5);
    doc.text(source.business.name, 16, y, { maxWidth: pageWidth * 0.52 });

    setTextRgb(doc, style.mutedColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    doc.text(getHeaderSubtitle(source).toUpperCase(), pageWidth - 16, y, {
        align: 'right',
        charSpace: 0.55,
        maxWidth: pageWidth * 0.34,
    });

    setDrawRgb(doc, style.borderColor);
    doc.setLineWidth(0.18);
    doc.line(16, y + 4, pageWidth - 16, y + 4);
    return y + 11;
}

function getCoverBackedContentPageTop(style: MenuCardVisualStyle): number {
    const layout = getFullPageThemeLayout(style);
    if (!layout) return 16;
    const balancedPanel = getBalancedFullPageThemePanel(style);
    if (balancedPanel) return balancedPanel.y + FULL_PAGE_PANEL_CONTENT_PADDING;
    if (layout.coverContentTop) return layout.coverContentTop;

    // Cover-backed menus already carry the complete identity stack. Content
    // pages therefore begin inside the theme's protected artwork field without
    // reserving the former repeated masthead area.
    return Math.max(18, (layout.panel?.y || 8) + 10);
}

function truncatePdfTextToWidth(doc: jsPDF, text: string, maxWidth: number): string {
    const normalized = text.trim();
    if (!normalized || maxWidth <= 0) return '';
    if (doc.getTextWidth(normalized) <= maxWidth) return normalized;

    const suffix = '...';
    let fitted = normalized;
    while (fitted.length > 1 && doc.getTextWidth(`${fitted}${suffix}`) > maxWidth) {
        fitted = fitted.slice(0, -1).trimEnd();
    }
    return fitted ? `${fitted}${suffix}` : '';
}

function getContentPageFooterLabel(
    doc: jsPDF,
    businessName: string,
    pageLabel: string,
    maxWidth: number,
): string {
    const separator = ' | ';
    const availableNameWidth = maxWidth - doc.getTextWidth(`${separator}${pageLabel}`);
    const fittedName = truncatePdfTextToWidth(doc, businessName, availableNameWidth);
    return fittedName ? `${fittedName}${separator}${pageLabel}` : pageLabel;
}

function drawCoverPage(
    doc: jsPDF,
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    pageWidth: number,
    pageHeight: number,
    logoDataUrl: string | null,
    qrDataUrl: string | null,
    style: MenuCardVisualStyle,
    backgroundArtwork: MenuCardBackgroundArtwork,
) {
    if (isReadableEditorialStyle(style)) {
        drawFullPageThemeCoverPage(
            doc,
            source,
            settings,
            pageWidth,
            pageHeight,
            logoDataUrl,
            style,
            backgroundArtwork,
        );
        return;
    }

    const centerX = pageWidth / 2;
    const isCompactPage = settings.paperSize === 'a5';
    const contentX = isCompactPage ? 24 : 30;
    const contentWidth = Math.min(pageWidth - contentX - 24, isCompactPage ? 100 : 148);
    const logoSize = isCompactPage ? 22 : 27;
    const titleSize = isCompactPage ? 23 : 31;
    const heroHeight = isCompactPage ? 102 : 138;

    setFillRgb(doc, blendRgb(style.accentColor, style.paperColor, 0.1));
    doc.rect(15, 15, pageWidth - 30, heroHeight, 'F');

    setFillRgb(doc, blendRgb(style.accentColor, style.paperColor, 0.17));
    doc.ellipse(pageWidth - 22, 39, isCompactPage ? 36 : 52, isCompactPage ? 31 : 44, 'F');
    setFillRgb(doc, blendRgb(style.accentColor, style.paperColor, 0.08));
    doc.ellipse(pageWidth - 8, 83, isCompactPage ? 42 : 62, isCompactPage ? 34 : 52, 'F');

    setFillRgb(doc, blendRgb(style.accentColor, style.paperColor, 0.045));
    doc.ellipse(19, pageHeight - 49, isCompactPage ? 31 : 49, isCompactPage ? 27 : 42, 'F');
    setFillRgb(doc, blendRgb(style.accentColor, style.paperColor, 0.075));
    doc.ellipse(-2, pageHeight - 27, isCompactPage ? 27 : 41, isCompactPage ? 22 : 33, 'F');

    drawCoverPageBackgroundArtwork(doc, backgroundArtwork, pageWidth, pageHeight, style);

    setDrawRgb(doc, style.accentColor);
    doc.setLineWidth(0.75);
    doc.line(22, 31, 22, heroHeight - 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isCompactPage ? 6.8 : 7.4);
    setTextRgb(doc, style.mutedColor);
    doc.text(getHeaderSubtitle(source).toUpperCase(), contentX, isCompactPage ? 57 : 66, {
        charSpace: 1.35,
        maxWidth: contentWidth,
    });

    if (settings.includeLogo) {
        drawLogoMark(doc, source, logoDataUrl, contentX, isCompactPage ? 27 : 29, logoSize, style);
    }

    doc.setFont('times', 'normal');
    doc.setFontSize(titleSize);
    setTextRgb(doc, style.accentColor);
    const nameLines = (doc.splitTextToSize(source.business.name, contentWidth) as string[]).slice(0, 3);
    const nameLineHeight = titleSize * 0.36;
    const nameStartY = isCompactPage ? 76 : 88;
    nameLines.forEach((line, index) => {
        doc.text(line, contentX, nameStartY + index * nameLineHeight, { maxWidth: contentWidth });
    });

    doc.setFont('times', 'italic');
    doc.setFontSize(isCompactPage ? 9.5 : 11);
    setTextRgb(doc, style.mutedColor);
    const subtitleY = nameStartY + Math.max(1, nameLines.length) * nameLineHeight + 5;
    doc.text(source.menu.title || getHeaderSubtitle(source), contentX, subtitleY, {
        maxWidth: contentWidth,
    });

    setDrawRgb(doc, style.borderColor);
    doc.setLineWidth(0.2);
    doc.line(contentX, subtitleY + 6, contentX + (isCompactPage ? 34 : 46), subtitleY + 6);

    const hasContact = settings.includeContactBlock && !!(source.business.address || source.business.phone);
    const hasQr = settings.includeQr && !!qrDataUrl;
    const hasPhone = hasContact && !!source.business.phone;
    const hasAddress = hasContact && !!source.business.address;
    const cardWidth = Math.min(pageWidth - 42, isCompactPage ? 72 : 82);
    const cardHeight = hasQr
        ? hasAddress ? 76 : hasPhone ? 68 : 56
        : hasAddress ? 44 : hasPhone ? 36 : 26;
    const cardX = isCompactPage ? centerX - cardWidth / 2 : pageWidth - cardWidth - 27;
    const cardY = pageHeight - cardHeight - (isCompactPage ? 30 : 34);
    setFillRgb(doc, blendRgb(style.accentColor, style.paperColor, 0.08));
    doc.roundedRect(cardX + 2.2, cardY + 2.2, cardWidth, cardHeight, 2, 2, 'F');
    setFillRgb(doc, [255, 255, 255]);
    setDrawRgb(doc, style.borderColor);
    doc.setLineWidth(0.18);
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'FD');

    if (hasQr && qrDataUrl) {
        const qrSize = 30;
        doc.addImage(
            qrDataUrl,
            'PNG',
            cardX + cardWidth / 2 - qrSize / 2,
            cardY + 6,
            qrSize,
            qrSize,
            MENU_CARD_QR_IMAGE_ALIAS,
        );
    }

    const cardCenterX = cardX + cardWidth / 2;
    const labelY = cardY + (hasQr ? 43 : 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    setTextRgb(doc, style.accentColor);
    doc.text(source.qr.label.toUpperCase(), cardCenterX, labelY, {
        align: 'center',
        maxWidth: cardWidth - 12,
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setTextRgb(doc, style.mutedColor);
    doc.text(source.qr.shortUrl || source.business.publicMenuUrl, cardCenterX, labelY + 6.5, {
        align: 'center',
        maxWidth: cardWidth - 12,
    });

    if (hasContact) {
        const dividerY = labelY + 10.5;
        setDrawRgb(doc, blendRgb(style.borderColor, [255, 255, 255], 0.62));
        doc.setLineWidth(0.14);
        doc.line(cardX + 9, dividerY, cardX + cardWidth - 9, dividerY);

        let contactY = dividerY + 6;
        doc.setFontSize(6.8);
        if (hasPhone && source.business.phone) {
            doc.text(source.business.phone, cardCenterX, contactY, {
                align: 'center',
                maxWidth: cardWidth - 14,
            });
            contactY += 6;
        }
        if (hasAddress && source.business.address) {
            doc.setFontSize(6.2);
            const addressLines = (doc.splitTextToSize(source.business.address, cardWidth - 16) as string[]).slice(0, 2);
            addressLines.forEach((line, index) => {
                doc.text(line, cardCenterX, contactY + index * 4.2, { align: 'center' });
            });
        }
    }
}

function drawFullPageThemeCoverPage(
    doc: jsPDF,
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    pageWidth: number,
    pageHeight: number,
    logoDataUrl: string | null,
    style: MenuCardVisualStyle,
    backgroundArtwork: MenuCardBackgroundArtwork,
) {
    drawCoverPageBackgroundArtwork(doc, backgroundArtwork, pageWidth, pageHeight, style);

    const centerX = pageWidth / 2;
    const contentWidth = pageWidth - 52;
    const logoSize = settings.paperSize === 'a5' ? 25 : 30;
    const titleSize = settings.paperSize === 'a5' ? 27 : 35;
    doc.setFont(usesSansDisplayStyle(style) ? 'helvetica' : 'times', 'bold');
    doc.setFontSize(titleSize);
    const nameLines = (doc.splitTextToSize(source.business.name, contentWidth) as string[]).slice(0, 2);
    const nameLineHeight = settings.paperSize === 'a5' ? 10.2 : 12.6;
    const tagline = source.business.tagline?.trim() || '';
    doc.setFont(usesSansDisplayStyle(style) ? 'helvetica' : 'times', usesSansDisplayStyle(style) ? 'normal' : 'italic');
    doc.setFontSize(settings.paperSize === 'a5' ? 9.5 : 10.5);
    const taglineLines = tagline
        ? (doc.splitTextToSize(tagline, contentWidth - 16) as string[]).slice(0, 2)
        : [];
    const taglineLineHeight = 5.2;
    const logoHeight = settings.includeLogo ? logoSize : 0;
    const logoGap = settings.includeLogo ? 9 : 0;
    const taglineBlockHeight = taglineLines.length > 0
        ? 7 + taglineLines.length * taglineLineHeight
        : 0;
    const labelGap = 9;
    const labelHeight = 4;
    const ruleGap = 7;
    const ruleHeight = 2;
    const groupHeight = logoHeight + logoGap
        + Math.max(1, nameLines.length) * nameLineHeight
        + taglineBlockHeight
        + labelGap + labelHeight + ruleGap + ruleHeight;
    const groupTop = (pageHeight - groupHeight) / 2;

    if (settings.includeLogo) {
        drawLogoMark(doc, source, logoDataUrl, centerX - logoSize / 2, groupTop, logoSize, style);
    }

    const nameStartY = groupTop + logoHeight + logoGap + nameLineHeight * 0.78;
    setTextRgb(doc, style.accentColor);
    doc.setFont(usesSansDisplayStyle(style) ? 'helvetica' : 'times', 'bold');
    doc.setFontSize(titleSize);
    nameLines.forEach((line, index) => {
        doc.text(line, centerX, nameStartY + index * nameLineHeight, { align: 'center' });
    });

    let identityBottom = nameStartY + Math.max(0, nameLines.length - 1) * nameLineHeight;
    if (taglineLines.length > 0) {
        const taglineStartY = identityBottom + 7;
        setTextRgb(doc, style.mutedColor);
        doc.setFont(usesSansDisplayStyle(style) ? 'helvetica' : 'times', usesSansDisplayStyle(style) ? 'normal' : 'italic');
        doc.setFontSize(settings.paperSize === 'a5' ? 9.5 : 10.5);
        taglineLines.forEach((line, index) => {
            doc.text(line, centerX, taglineStartY + index * taglineLineHeight, { align: 'center' });
        });
        identityBottom = taglineStartY + Math.max(0, taglineLines.length - 1) * taglineLineHeight;
    }

    setTextRgb(doc, style.mutedColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    const labelY = identityBottom + labelGap;
    drawCenteredTrackedText(doc, getHeaderSubtitle(source).toUpperCase(), centerX, labelY, 1.35);

    const ruleY = labelY + ruleGap;
    setDrawRgb(doc, style.borderColor);
    doc.setLineWidth(0.4);
    doc.line(51, ruleY, pageWidth - 51, ruleY);
    doc.setLineWidth(0.12);
    doc.line(57, ruleY + 1.8, pageWidth - 57, ruleY + 1.8);
}

function drawFullPageThemeClosingPage(
    doc: jsPDF,
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    qrDataUrl: string | null,
    logoDataUrl: string | null,
    pageWidth: number,
    pageHeight: number,
    style: MenuCardVisualStyle,
) {
    const centerX = pageWidth / 2;
    const layout = getFullPageThemeLayout(style);
    const hasContact = settings.includeContactBlock && Boolean(source.business.phone || source.business.address);
    const hasQr = settings.includeQr && Boolean(qrDataUrl);
    const logoSize = 23;
    let y = Math.max(46, Math.min(68, layout?.contentTop || 52));

    if (settings.includeLogo) {
        drawLogoMark(doc, source, logoDataUrl, centerX - logoSize / 2, y, logoSize, style);
        y += logoSize + 9;
    }

    doc.setFont(usesSansDisplayStyle(style) ? 'helvetica' : 'times', 'bold');
    doc.setFontSize(usesSansDisplayStyle(style) ? 18.5 : 20);
    setTextRgb(doc, style.accentColor);
    const nameLines = (doc.splitTextToSize(source.business.name, pageWidth - 64) as string[]).slice(0, 2);
    nameLines.forEach((line, index) => {
        doc.text(line, centerX, y + index * 7.6, { align: 'center' });
    });
    y += Math.max(1, nameLines.length) * 7.6;

    const tagline = source.business.tagline?.trim();
    if (tagline) {
        doc.setFont(usesSansDisplayStyle(style) ? 'helvetica' : 'times', usesSansDisplayStyle(style) ? 'normal' : 'italic');
        doc.setFontSize(9.5);
        setTextRgb(doc, isDarkEditorialStyle(style) ? getReadableEditorialBodyColor(style) : style.mutedColor);
        const taglineLines = (doc.splitTextToSize(tagline, pageWidth - 78) as string[]).slice(0, 2);
        taglineLines.forEach((line, index) => {
            doc.text(line, centerX, y + index * 4.8, { align: 'center' });
        });
        y += taglineLines.length * 4.8 + 5;
    } else {
        y += 3;
    }

    setDrawRgb(doc, style.borderColor);
    doc.setLineWidth(0.34);
    doc.line(52, y, pageWidth - 52, y);
    doc.setLineWidth(0.11);
    doc.line(58, y + 1.5, pageWidth - 58, y + 1.5);
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    setTextRgb(doc, isDarkEditorialStyle(style) ? getReadableEditorialBodyColor(style) : style.mutedColor);
    drawCenteredTrackedText(
        doc,
        hasContact ? 'CONTACT & LOCATION' : 'VIEW ONLINE',
        centerX,
        y,
        1.05,
    );
    y += 10;

    if (hasQr && qrDataUrl) {
        const qrSize = 42;
        setFillRgb(doc, blendRgb([255, 255, 255], style.paperColor, 0.82));
        doc.roundedRect(centerX - qrSize / 2 - 3.5, y - 3.5, qrSize + 7, qrSize + 7, 1.8, 1.8, 'F');
        doc.addImage(
            qrDataUrl,
            'PNG',
            centerX - qrSize / 2,
            y,
            qrSize,
            qrSize,
            MENU_CARD_QR_IMAGE_ALIAS,
        );
        y += qrSize + 9;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        setTextRgb(doc, style.accentColor);
        doc.text(getConciseQrLabel(source.qr.label).toUpperCase(), centerX, y, {
            align: 'center',
            maxWidth: pageWidth - 74,
        });
        y += 7;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    setTextRgb(doc, isDarkEditorialStyle(style) ? getReadableEditorialBodyColor(style) : style.mutedColor);
    [
        ...(hasContact ? [source.business.phone, source.business.address] : []),
        source.qr.shortUrl || source.business.publicMenuUrl,
    ]
        .filter((value): value is string => Boolean(value))
        .forEach((value) => {
            const lines = (doc.splitTextToSize(value, pageWidth - 76) as string[]).slice(0, 2);
            lines.forEach((line) => {
                doc.text(line, centerX, y, { align: 'center' });
                y += 5.4;
            });
        });
}

function drawFooter(
    doc: jsPDF,
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    qrDataUrl: string | null,
    generatedAt: Date,
    hasCoverPage: boolean,
    hasDedicatedClosingPage: boolean,
    style: MenuCardVisualStyle,
) {
    const total = doc.getNumberOfPages();
    const contentPageTotal = Math.max(
        1,
        total - (hasCoverPage ? 1 : 0) - (hasDedicatedClosingPage ? 1 : 0),
    );
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 12;
    const decisionSymbolLegend = getMenuDecisionSymbolLegend(source);

    for (let page = 1; page <= total; page += 1) {
        doc.setPage(page);
        if (isFullPageThemeStyle(style)) {
            if (hasCoverPage && page === 1) {
                drawPdfMenuListAttribution(doc, pageWidth, pageHeight - 7, style.mutedColor, source.business.activePlanType);
                continue;
            }
            if (hasDedicatedClosingPage && page === total) {
                drawPdfMenuListAttribution(doc, pageWidth, pageHeight - 5.2, style.mutedColor, source.business.activePlanType);
                continue;
            }

            const hasDecisionSymbolLegend = decisionSymbolLegend.length > 0;
            drawFullPageThemeFooterPanel(
                doc,
                pageWidth,
                pageHeight,
                style,
                hasDecisionSymbolLegend,
            );

            const currencyCode = source.menu.currencyCode?.toUpperCase() || source.menu.currency || '';
            const updated = source.menu.updatedAt ? new Date(source.menu.updatedAt) : generatedAt;
            const footerRuleY = pageHeight - (
                hasDecisionSymbolLegend
                    ? FULL_PAGE_LEGEND_FOOTER_HEIGHT + 1
                    : 20
            );
            const footerRuleLowerY = footerRuleY + 1.6;
            setDrawRgb(doc, style.borderColor);
            doc.setLineWidth(0.35);
            doc.line(12, footerRuleY, pageWidth - 12, footerRuleY);
            doc.setLineWidth(0.12);
            doc.line(12, footerRuleLowerY, pageWidth - 12, footerRuleLowerY);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.1);
            setTextRgb(
                doc,
                isDarkEditorialStyle(style)
                    ? style.mutedColor
                    : blendRgb(style.mutedColor, [36, 34, 32], 0.7),
            );
            if (decisionSymbolLegend.length > 0) {
                drawPrintDecisionSymbolLegend(
                    doc,
                    decisionSymbolLegend,
                    12,
                    footerRuleLowerY + FULL_PAGE_LEGEND_BASELINE_SAFE_GAP,
                    pageWidth - 24,
                    style,
                );
            }
            const priceNote = currencyCode ? `All prices in ${currencyCode}` : 'Prices shown as listed';
            const updateNote = settings.includeUpdatedDate ? `  |  Updated ${formatArtifactDate(updated)}` : '';
            doc.text(`${priceNote}${updateNote}`, 12, pageHeight - 7.5, { maxWidth: pageWidth * 0.62 });

            const contentPageNumber = page - (hasCoverPage ? 1 : 0);
            const pageLabel = `PAGE ${contentPageNumber} / ${contentPageTotal}`;
            const footerLabel = getContentPageFooterLabel(
                doc,
                source.business.name,
                pageLabel,
                pageWidth * 0.34,
            );
            doc.setFont('helvetica', 'bold');
            doc.text(footerLabel, pageWidth - 12, pageHeight - 7.5, { align: 'right' });
            drawPdfMenuListAttribution(doc, pageWidth, pageHeight - 3.9, style.mutedColor, source.business.activePlanType);
            continue;
        }

        setDrawRgb(doc, blendRgb(hexToRgb(source.business.brandTokens.accentColor), [210, 210, 210], 0.22));
        doc.setLineWidth(0.25);
        doc.line(12, footerY - 8, pageWidth - 12, footerY - 8);

        const isCoverPage = hasCoverPage && page === 1;
        const isClosingPage = hasDedicatedClosingPage && page === total;
        if (!isCoverPage && !isClosingPage && decisionSymbolLegend.length > 0) {
            drawPrintDecisionSymbolLegend(
                doc,
                decisionSymbolLegend,
                12,
                pageHeight - 15.2,
                pageWidth - 24,
                style,
            );
        }
        drawPdfMenuListAttribution(doc, pageWidth, pageHeight - 3.9, [108, 108, 108], source.business.activePlanType);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(108, 108, 108);
        doc.setFontSize(7);
        const updated = source.menu.updatedAt ? new Date(source.menu.updatedAt) : generatedAt;
        if (settings.includeUpdatedDate) {
            doc.text(`Menu updated ${formatArtifactDate(updated)}`, 12, pageHeight - 7.5, { align: 'left' });
        }
        if (!(hasCoverPage && page === 1)) {
            const contentPageNumber = page - (hasCoverPage ? 1 : 0);
            const pageLabel = `Page ${contentPageNumber} / ${contentPageTotal}`;
            const footerLabel = getContentPageFooterLabel(
                doc,
                source.business.name,
                pageLabel,
                pageWidth * 0.38,
            );
            doc.text(footerLabel, pageWidth - 12, pageHeight - 7.5, { align: 'right' });
        }

        if (!hasCoverPage && page === 1 && settings.includeQr && qrDataUrl) {
            const qrSize = settings.preset === 'whatsapp' ? 20 : 18;
            const cardX = 12;
            const cardY = pageHeight - 43;
            const cardWidth = Math.min(92, pageWidth - 24);
            const cardHeight = 22;
            setFillRgb(doc, [255, 255, 255]);
            setDrawRgb(doc, blendRgb(hexToRgb(source.business.brandTokens.accentColor), [220, 220, 220], 0.2));
            doc.setLineWidth(0.16);
            doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 1.4, 1.4, 'FD');
            doc.addImage(
                qrDataUrl,
                'PNG',
                cardX + 2,
                cardY + 2,
                qrSize,
                qrSize,
                MENU_CARD_QR_IMAGE_ALIAS,
            );
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.2);
            doc.setTextColor(58, 58, 58);
            doc.text(source.qr.label.toUpperCase(), cardX + qrSize + 6, cardY + 9, { maxWidth: cardWidth - qrSize - 9 });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(105, 105, 105);
            doc.text(source.qr.shortUrl || source.business.publicMenuUrl, cardX + qrSize + 6, cardY + 14, { maxWidth: cardWidth - qrSize - 9 });
        }
    }
}

function getCategoryTitleHeight(
    doc: jsPDF,
    category: PrintCategory,
    width: number,
    settings: MenuCardExportSettings,
    style: MenuCardVisualStyle,
    continued = false,
    hasIcon = false,
): number {
    const sizes = getFontSizes(settings);
    const displayName = continued ? `${category.name} (continued)` : category.name;
    const iconReserve = hasIcon ? CATEGORY_TITLE_ICON_SIZE + CATEGORY_TITLE_ICON_GAP : 0;
    if (isReadableEditorialStyle(style)) {
        if (usesStructuredServiceLayout(style)) {
            const lines = (doc.splitTextToSize(displayName.toUpperCase(), width - 5 - iconReserve) as string[]).slice(0, 2);
            return 16.8 + Math.max(0, lines.length - 1) * 7;
        }
        const lines = (doc.splitTextToSize(displayName.toUpperCase(), width - 6 - iconReserve) as string[]).slice(0, 2);
        return 22.4 + Math.max(0, lines.length - 1) * 8.5;
    }
    if (style.categoryMode === 'editorial') {
        const lines = (doc.splitTextToSize(displayName, width - iconReserve) as string[]).slice(0, 2);
        return 14 + Math.max(0, lines.length - 1) * 6;
    }
    if (style.categoryMode === 'boxed') {
        const lines = (doc.splitTextToSize(displayName.toUpperCase(), width - 4 - iconReserve) as string[]).slice(0, 2);
        return lines.length > 1 ? 16.3 : 12;
    }
    return 12;
}

function drawCategoryTitle(
    doc: jsPDF,
    category: PrintCategory,
    x: number,
    y: number,
    width: number,
    settings: MenuCardExportSettings,
    style: MenuCardVisualStyle,
    iconDataUrl?: string,
    continued = false,
) {
    const sizes = getFontSizes(settings);
    const displayName = continued ? `${category.name} (continued)` : category.name;
    const label = displayName.toUpperCase();
    const iconReserve = iconDataUrl ? CATEGORY_TITLE_ICON_SIZE + CATEGORY_TITLE_ICON_GAP : 0;
    const drawIcon = (iconX: number, iconY: number) => {
        if (!iconDataUrl) return;
        try {
            doc.addImage(iconDataUrl, 'PNG', iconX, iconY, CATEGORY_TITLE_ICON_SIZE, CATEGORY_TITLE_ICON_SIZE);
        } catch {
            // A category heading remains useful when one browser cannot rasterize its icon.
        }
    };

    if (isReadableEditorialStyle(style)) {
        if (usesStructuredServiceLayout(style)) {
            const lines = (doc.splitTextToSize(label, width - 5 - iconReserve) as string[]).slice(0, 2);
            doc.setFont(usesSansDisplayStyle(style) ? 'helvetica' : 'times', 'bold');
            doc.setFontSize(continued ? 16.5 : 18.5);
            setTextRgb(doc, style.accentColor);
            lines.forEach((line, index) => {
                doc.text(line, x + 2.8 + (index === 0 ? iconReserve : 0), y + 6.4 + index * 7, {
                    ...(usesSansDisplayStyle(style) ? { charSpace: 0.55 } : {}),
                    maxWidth: width - 5 - (index === 0 ? iconReserve : 0),
                });
            });
            drawIcon(x + 2.8, y + 1.55);
            const ruleY = y + 10.4 + Math.max(0, lines.length - 1) * 7;
            setDrawRgb(doc, style.borderColor);
            doc.setLineWidth(0.28);
            doc.line(x, ruleY, x + width, ruleY);
            return ruleY + 6.4;
        }
        const titleSize = continued ? 21 : Math.max(25, sizes.category + 12.5);
        doc.setFont('times', 'bold');
        doc.setFontSize(titleSize);
        setTextRgb(doc, style.accentColor);
        const lines = (doc.splitTextToSize(label, width - 6 - iconReserve) as string[]).slice(0, 2);
        lines.forEach((line, index) => {
            if (index === 0 && iconDataUrl) {
                const textWidth = doc.getTextWidth(line);
                const groupWidth = Math.min(width, CATEGORY_TITLE_ICON_SIZE + CATEGORY_TITLE_ICON_GAP + textWidth);
                const groupX = x + Math.max(0, (width - groupWidth) / 2);
                drawIcon(groupX, y + 3.45);
                doc.text(line, groupX + iconReserve, y + 8.4);
                return;
            }
            doc.text(line, x + width / 2, y + 8.4 + index * 8.5, { align: 'center' });
        });
        const ruleY = y + 13.2 + Math.max(0, lines.length - 1) * 8.5;
        setDrawRgb(doc, style.borderColor);
        doc.setLineWidth(0.36);
        doc.line(x, ruleY, x + width, ruleY);
        doc.setLineWidth(0.11);
        doc.line(x, ruleY + 1.45, x + width, ruleY + 1.45);
        return ruleY + 9.2;
    }

    if (style.categoryMode === 'editorial') {
        doc.setFont('times', 'italic');
        doc.setFontSize(Math.max(14.5, sizes.category + 4.5));
        setTextRgb(doc, style.accentColor);
        const lines = (doc.splitTextToSize(displayName, width - iconReserve) as string[]).slice(0, 2);
        lines.slice(0, 2).forEach((line, index) => {
            doc.text(line, x + (index === 0 ? iconReserve : 0), y + 6 + index * 6);
        });
        drawIcon(x, y + 1.15);
        setDrawRgb(doc, style.borderColor);
        doc.setLineWidth(0.22);
        doc.line(x, y + 9 + Math.max(0, lines.length - 1) * 6, x + width, y + 9 + Math.max(0, lines.length - 1) * 6);
        return y + 14 + Math.max(0, lines.length - 1) * 6;
    }

    if (style.categoryMode === 'boxed') {
        const labelLines = (doc.splitTextToSize(label, width - 4 - iconReserve) as string[]).slice(0, 2);
        const categoryFontSize = labelLines.length > 1 ? Math.max(8.7, sizes.category - 1) : sizes.category;
        const lineHeight = labelLines.length > 1 ? 4.3 : 4.8;
        const firstBaseline = y + 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(categoryFontSize);
        setTextRgb(doc, style.accentColor);
        labelLines.forEach((line, index) => {
            doc.text(line, x + (index === 0 ? iconReserve : 0), firstBaseline + index * lineHeight, {
                maxWidth: width - (index === 0 ? iconReserve : 0),
            });
        });
        drawIcon(x, y - 0.45);
        const ruleY = firstBaseline + Math.max(0, labelLines.length - 1) * lineHeight + 3;
        setDrawRgb(doc, style.borderColor);
        doc.setLineWidth(0.18);
        doc.line(x, ruleY, x + width, ruleY);
        return ruleY + 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sizes.category);
    setFillRgb(doc, style.accentColor);
    doc.roundedRect(x, y, 2.2, 7.2, 0.5, 0.5, 'F');
    setTextRgb(doc, style.accentColor);
    drawIcon(x + 5, y + 0.95);
    doc.text(label, x + 5 + iconReserve, y + 5.2, { maxWidth: width - 5 - iconReserve });
    setDrawRgb(doc, style.borderColor);
    doc.setLineWidth(0.18);
    doc.line(x, y + 8.8, x + width, y + 8.8);
    return y + 12;
}

function drawDottedLeader(doc: jsPDF, startX: number, endX: number, y: number, color: RgbColor) {
    if (endX - startX < 5) return;
    const dashedDoc = doc as jsPDF & {
        setLineDashPattern?: (pattern: number[], phase: number) => void;
    };
    setDrawRgb(doc, color);
    doc.setLineWidth(0.18);
    if (typeof dashedDoc.setLineDashPattern === 'function') {
        dashedDoc.setLineDashPattern([0.45, 1.25], 0);
        doc.line(startX, y, endX, y);
        dashedDoc.setLineDashPattern([], 0);
        return;
    }
    doc.line(startX, y, endX, y);
}

function drawItem(doc: jsPDF, item: PrintItem, x: number, y: number, width: number, source: MenuCardPrintSource, settings: MenuCardExportSettings, style: MenuCardVisualStyle): number {
    const sizes = getFontSizes(settings);
    const isReadableEditorial = isReadableEditorialStyle(style);
    const readableBodyColor = getReadableEditorialBodyColor(style);
    const nameLineHeight = isReadableEditorial ? getEditorialNameLineHeight(style) : settings.density === 'compact' ? 3.7 : settings.density === 'comfortable' ? 4.8 : 4.2;
    const layout = getItemLayout(doc, item, width, source, settings, style);
    const { decisionSymbolGap, decisionSymbolWidth, nameLines, nameWidth, price, priceWidth } = layout;
    const itemFontSize = isReadableEditorial ? getEditorialItemFontSize(style) : sizes.item;

    doc.setFont(isReadableEditorial ? 'helvetica' : style.categoryMode === 'editorial' && style.itemTone !== 'product' ? 'times' : 'helvetica', 'bold');
    doc.setFontSize(itemFontSize);
    setTextRgb(doc, isReadableEditorial ? readableBodyColor : [30, 30, 30]);
    nameLines.forEach((line, index) => {
        doc.text(line, x, y + index * nameLineHeight, { maxWidth: nameWidth });
    });

    const finalNameLine = nameLines[nameLines.length - 1] || item.name;
    const finalNameBaseline = y + Math.max(0, nameLines.length - 1) * nameLineHeight;
    const finalNameLineWidth = doc.getTextWidth(finalNameLine);
    const decisionSymbolStartX = x + finalNameLineWidth + decisionSymbolGap;
    if (decisionSymbolWidth > 0) {
        const itemVisualCenterY = finalNameBaseline - itemFontSize * 0.352778 * 0.35;
        drawPrintDecisionSymbolCluster(
            doc,
            item.decisionSymbols || [],
            decisionSymbolStartX,
            itemVisualCenterY,
            style,
        );
    }

    if (price) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(itemFontSize);
        setTextRgb(doc, isReadableEditorial ? readableBodyColor : style.accentColor);
        doc.text(price, x + width, y, { align: 'right' });
        if (style.usePriceLeaders) {
            const firstLineWidth = doc.getTextWidth(nameLines[0] || item.name);
            const firstLineDecorationWidth = nameLines.length === 1
                ? decisionSymbolGap + decisionSymbolWidth
                : 0;
            drawDottedLeader(
                doc,
                x + Math.min(firstLineWidth + firstLineDecorationWidth + 2.2, nameWidth + decisionSymbolWidth - 1),
                x + width - priceWidth - 1,
                y - 1.1,
                blendRgb(style.borderColor, style.paperColor, 0.62),
            );
        }
    }

    const supportingText = getItemSupportingText(item, settings);
    const hasSupportingContent = Boolean(supportingText || item.attributes.length > 0);
    const postNameGap = hasSupportingContent ? getItemDescriptionGap(settings, style) : 0;
    let nextY = y + Math.max(1, nameLines.length) * nameLineHeight + postNameGap;

    if (supportingText) {
        doc.setFont(isReadableEditorial ? 'helvetica' : style.categoryMode === 'editorial' && style.itemTone !== 'product' ? 'times' : 'helvetica', isReadableEditorial || style.itemTone === 'service' ? 'normal' : 'italic');
        doc.setFontSize(isReadableEditorial ? getEditorialDescriptionFontSize(style) : sizes.description);
        setTextRgb(doc, isReadableEditorial ? readableBodyColor : style.mutedColor);
        const descLines = doc.splitTextToSize(supportingText, width - 4) as string[];
        descLines.slice(0, settings.density === 'compact' ? 2 : 4).forEach((line) => {
            doc.text(line, x, nextY);
            nextY += isReadableEditorial ? getEditorialDescriptionLineHeight(style) : 3.3;
        });
    }

    if (item.attributes.length > 0) {
        const attributeLayouts = getPrintAttributeLayouts(doc, item, width, source, settings, style);
        const attributeFontSize = getPrintAttributeFontSize(settings, style);
        const attributeLineHeight = getPrintAttributeLineHeight(settings, style);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(attributeFontSize);
        setTextRgb(doc, isReadableEditorial ? readableBodyColor : style.mutedColor);
        attributeLayouts.forEach((attribute) => {
            attribute.lines.forEach((line, lineIndex) => {
                doc.text(line, x, nextY + lineIndex * attributeLineHeight);
            });
            if (attribute.price) {
                doc.setFont('helvetica', 'bold');
                setTextRgb(doc, isReadableEditorial ? readableBodyColor : style.accentColor);
                doc.text(attribute.price, x + width, nextY, { align: 'right' });
                doc.setFont('helvetica', 'normal');
                setTextRgb(doc, isReadableEditorial ? readableBodyColor : style.mutedColor);
            }
            nextY += attribute.rowHeight;
        });
    }

    return nextY + getItemEndGap(settings, style, hasSupportingContent);
}

export async function renderPdf(
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    overrides: MenuCardSafeOverrides = {},
    generatedAt: Date = new Date(),
    renderOptions: MenuCardRenderOptions = {},
): Promise<MenuCardGeneratedArtifact> {
    const template = getMenuCardTemplate(settings.styleId);
    const sourceHash = buildPrintSourceHash(source, settings, overrides);
    const categories = expandPrintOptionSegments(
        applySafeLayoutOverrides(source.menu.categories, overrides),
    );
    const doc = new jsPDF({ orientation: settings.orientation, unit: 'mm', format: getFormat(settings) });
    doc.setCreationDate(generatedAt);
    doc.setProperties(buildPdfDocumentProperties({ source, settings, template, sourceHash }));
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const businessProfile = resolveMenuCardBusinessPrintProfile({
        businessCategory: source.business.businessCategory,
        catalogKind: source.business.catalogKind,
        offeringKind: source.business.offeringKind,
    });
    const printableThemeTokens = settings.printableThemeId
        ? resolvePrintableTemplateBrandTokens(source.business.brandTokens.accentColor, settings.printableThemeId)
        : null;
    const baseStyle = getVisualStyle(
        template.family,
        hexToRgb(printableThemeTokens?.accent || source.business.brandTokens.accentColor),
        businessProfile.tone,
    );
    const style: MenuCardVisualStyle = printableThemeTokens ? {
        ...baseStyle,
        accentColor: hexToRgb(printableThemeTokens.accent),
        bodyColor: hexToRgb(printableThemeTokens.text),
        borderColor: hexToRgb(printableThemeTokens.border),
        mutedColor: hexToRgb(printableThemeTokens.muted),
        paperColor: hexToRgb(printableThemeTokens.paper),
        printableThemeId: settings.printableThemeId,
    } : baseStyle;
    const themeArtworkPaths = getPrintableThemeArtworkPaths(settings.printableThemeId);
    const useEditorialBackground = Boolean(themeArtworkPaths)
        || shouldUseEditorialBackground(template.family, businessProfile.tone, settings);
    const printBox = getPrintBox(settings);
    const fullPageThemeLayout = getFullPageThemeLayout(style);
    const hasMenuDecisionSymbolLegend = getMenuDecisionSymbolLegend(source).length > 0;
    const fullPageBottomReserve = Math.max(
        FULL_PAGE_LEGEND_MIN_BOTTOM_RESERVE,
        (fullPageThemeLayout?.bottomReserve || 38)
            - (hasMenuDecisionSymbolLegend ? FULL_PAGE_LEGEND_FOOTER_CONTENT_RECLAIM : 0),
    );
    const margin = Math.max(
        printBox.safeMargin,
        getFullPageThemeContentMargin(style)
            ?? (isReadableEditorialStyle(style) ? 26 : useEditorialBackground ? 24 : printBox.safeMargin),
    );
    const footerReserve = printBox.footerReserve;
    const columns = Math.max(1, Math.min(template.columns, resolveMenuCardColumnCount(settings, categories)));
    const gutter = columns > 1 ? 8 : 0;
    const columnWidth = (pageWidth - margin * 2 - gutter * (columns - 1)) / columns;
    const fallbackLogoDataUrl = typeof renderOptions.fallbackLogoDataUrl === 'string'
        && renderOptions.fallbackLogoDataUrl.startsWith('data:image/png;base64,')
        && renderOptions.fallbackLogoDataUrl.length <= MAX_MENU_CARD_EMBEDDED_LOGO_DATA_URL_LENGTH
        ? renderOptions.fallbackLogoDataUrl
        : null;
    const logoDataUrl = settings.includeLogo
        ? await imageUrlToPngDataUrl(source.business.logoUrl) || fallbackLogoDataUrl
        : null;
    const qrDataUrl = settings.includeQr ? await renderQr(source.qr.destinationUrl, source.qr.errorCorrection) : null;
    const categoryIconDataUrls = new Map<string, string>();
    const categoryIcons = Array.from(new Set(
        categories.map((category) => category.icon).filter((icon): icon is string => Boolean(icon)),
    ));
    await Promise.all(categoryIcons.map(async (icon) => {
        const dataUrl = await createPrintableCategoryIconDataUrl(icon, rgbToCss(style.accentColor));
        if (dataUrl) categoryIconDataUrls.set(icon, dataUrl);
    }));
    const hasCoverPage = settings.includeCoverPage === true;
    const backgroundArtwork: MenuCardBackgroundArtwork = useEditorialBackground
        ? {
            botanicalCorner: safeEmbeddedArtworkDataUrl(renderOptions.backgroundArtworkDataUrls?.botanicalCorner)
                || await builtInArtworkToPngDataUrl(
                    themeArtworkPaths?.corner
                    || (isFullPageThemeStyle(style) ? '' : MENU_CARD_BOTANICAL_CORNER_PATH),
                ),
            botanicalRail: safeEmbeddedArtworkDataUrl(renderOptions.backgroundArtworkDataUrls?.botanicalRail)
                || await builtInArtworkToPngDataUrl(
                    themeArtworkPaths?.rail
                    || (isFullPageThemeStyle(style) ? '' : MENU_CARD_BOTANICAL_RAIL_PATH),
                ),
            craftKitchenPage: isCraftKitchenStyle(style)
                ? safeEmbeddedArtworkDataUrl(renderOptions.backgroundArtworkDataUrls?.craftKitchenPage)
                    || await builtInArtworkToPngDataUrl(MENU_CARD_CRAFT_KITCHEN_PAGE_PATH)
                : null,
            themePage: isFullPageThemeStyle(style)
                ? safeEmbeddedArtworkDataUrl(renderOptions.backgroundArtworkDataUrls?.themePage)
                    || (isCraftKitchenStyle(style)
                        ? safeEmbeddedArtworkDataUrl(renderOptions.backgroundArtworkDataUrls?.craftKitchenPage)
                        : null)
                    || await builtInArtworkToPngDataUrl(
                        themeArtworkPaths?.page
                        || MENU_CARD_THEME_PAGE_PATHS[style.printableThemeId || '']
                        || '',
                    )
                : null,
        }
        : { botanicalCorner: null, botanicalRail: null, craftKitchenPage: null, themePage: null };

    drawPageBase(doc, style, pageWidth, pageHeight);
    let firstPageContentTop: number;
    if (hasCoverPage) {
        drawCoverPage(doc, source, settings, pageWidth, pageHeight, logoDataUrl, qrDataUrl, style, backgroundArtwork);
        doc.addPage();
        drawPageBase(doc, style, pageWidth, pageHeight);
        drawContentPageBackground(doc, backgroundArtwork, pageWidth, pageHeight, 1, style);
        firstPageContentTop = getCoverBackedContentPageTop(style);
    } else {
        drawContentPageBackground(doc, backgroundArtwork, pageWidth, pageHeight, 1, style);
        firstPageContentTop = drawHeader(doc, source, settings, pageWidth, logoDataUrl, style);
    }
    let columnIndex = 0;
    let pageIndex = 1;
    let currentPageContentTop = hasCoverPage
        ? firstPageContentTop
        : Math.max(
            firstPageContentTop,
            margin + 4,
            getFullPageThemeContentTop(style),
        );
    let y = currentPageContentTop;

    const getColumnTop = () => currentPageContentTop;
    const getContentBottom = () => isFullPageThemeStyle(style)
        ? pageHeight - fullPageBottomReserve
            : pageHeight - (pageIndex === 1 && !hasCoverPage ? footerReserve : 16) - 14;

    const nextColumnOrPage = () => {
        if (columnIndex < columns - 1) {
            columnIndex += 1;
            y = getColumnTop();
            return;
        } else {
            doc.addPage();
            drawPageBase(doc, style, pageWidth, pageHeight);
            pageIndex += 1;
            drawContentPageBackground(doc, backgroundArtwork, pageWidth, pageHeight, pageIndex, style);
            columnIndex = 0;
            currentPageContentTop = hasCoverPage
                ? getCoverBackedContentPageTop(style)
                : Math.max(
                    drawContinuationHeader(doc, source, pageWidth, style),
                    margin + 4,
                    getFullPageThemeContentTop(style),
                );
            y = getColumnTop();
        }
    };

    const columnX = () => margin + columnIndex * (columnWidth + gutter);

    categories.forEach((category) => {
        const categoryIconDataUrl = category.icon ? categoryIconDataUrls.get(category.icon) : undefined;
        const itemHeights = category.items.map((item) => itemHeight(doc, item, columnWidth, source, settings, style));
        const titleHeight = getCategoryTitleHeight(
            doc,
            category,
            columnWidth,
            settings,
            style,
            false,
            Boolean(categoryIconDataUrl),
        );
        const estimatedCategoryHeight = titleHeight + itemHeights.reduce((sum, height) => sum + height, 0) + 4;
        const fullColumnHeight = getContentBottom() - getColumnTop();
        const keepWholeItemLimit = style.categoryMode === 'boxed' ? 6 : 4;
        const keepWhole = category.items.length <= keepWholeItemLimit && estimatedCategoryHeight <= fullColumnHeight;
        const minimumItems = keepWhole ? category.items.length : Math.min(2, category.items.length);
        const minimumStartHeight = titleHeight
            + itemHeights.slice(0, minimumItems).reduce((sum, height) => sum + height, 0);
        const availableHeight = getContentBottom() - y;
        const isAtColumnTop = Math.abs(y - getColumnTop()) < 0.1;

        if (!isAtColumnTop && (minimumStartHeight > availableHeight || (keepWhole && estimatedCategoryHeight > availableHeight))) {
            nextColumnOrPage();
        }

        y = drawCategoryTitle(doc, category, columnX(), y, columnWidth, settings, style, categoryIconDataUrl);

        category.items.forEach((item, itemIndex) => {
            const height = itemHeights[itemIndex] || itemHeight(doc, item, columnWidth, source, settings, style);
            if (y + height > getContentBottom()) {
                nextColumnOrPage();
                y = drawCategoryTitle(doc, category, columnX(), y, columnWidth, settings, style, categoryIconDataUrl, true);
            }
            y = drawItem(doc, item, columnX(), y, columnWidth, source, settings, style);
        });

        y += 4;
    });

    const hasDedicatedClosingPage = isFullPageThemeStyle(style)
        && (settings.includeContactBlock || Boolean(settings.includeQr && qrDataUrl));
    if (hasDedicatedClosingPage) {
        doc.addPage();
        drawPageBase(doc, style, pageWidth, pageHeight);
        drawContentPageBackground(doc, backgroundArtwork, pageWidth, pageHeight, pageIndex + 1, style);
        drawFullPageThemeClosingPage(doc, source, settings, qrDataUrl, logoDataUrl, pageWidth, pageHeight, style);
    }

    drawFooter(
        doc,
        source,
        settings,
        qrDataUrl,
        generatedAt,
        hasCoverPage,
        hasDedicatedClosingPage,
        style,
    );

    const blob = doc.output('blob');

    return {
        blob,
        filename: buildArtifactFilename({ source, settings, template, sourceHash, extension: 'pdf', generatedAt }),
        mimeType: 'application/pdf',
        pageCount: doc.getNumberOfPages(),
        sourceHash,
    };
}
