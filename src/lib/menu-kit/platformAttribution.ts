import { resolveMenuListAttributionPolicy } from '@lib/platform/menuListBranding';

const MENU_LIST_MARK_VIEWBOX = {
    x: 1260,
    y: 610,
    width: 870,
    height: 500,
};

const MENU_LIST_MARK_WIDTH_RATIO = MENU_LIST_MARK_VIEWBOX.width / MENU_LIST_MARK_VIEWBOX.height;

export const MENU_LIST_DOMAIN = 'menulist.ai';
export const MENU_LIST_ATTRIBUTION_TEXT = `Powered by MenuList | ${MENU_LIST_DOMAIN}`;
export const MENU_LIST_MENU_ATTRIBUTION_TEXT = `Menu powered by MenuList | ${MENU_LIST_DOMAIN}`;

const MENU_LIST_MARK_PATH_A = 'M1664.9 725.404C1640.93 696.899 1608.97 676.232 1573.14 666.07C1537.31 655.908 1499.26 656.717 1463.89 668.394C1428.53 680.07 1397.48 702.078 1374.74 731.577C1352.01 761.076 1338.63 796.711 1336.35 833.884C1334.07 871.057 1342.98 908.061 1361.93 940.12C1380.88 972.18 1409.01 997.823 1442.68 1013.74C1476.35 1029.66 1514.02 1035.12 1550.82 1029.42C1587.63 1023.72 1627.82 1000.02 1655.09 974.66M1662.82 723.153L1784.28 847.619L1719.9 908.993';
const MENU_LIST_MARK_PATH_B = 'M1715.48 970.547C1739.76 999.424 1772.14 1020.36 1808.44 1030.66C1844.73 1040.95 1883.28 1040.13 1919.11 1028.3C1954.94 1016.47 1986.4 994.177 2009.43 964.294C2032.46 934.41 2046 898.31 2048.32 860.652C2050.63 822.995 2041.61 785.508 2022.4 753.03C2003.2 720.552 1974.71 694.575 1940.6 678.449C1906.49 662.324 1868.33 656.792 1831.05 662.567C1793.76 668.341 1752.25 692.743 1724.62 718.43M1717.59 972.827L1594.55 846.738L1658.1 784.526';

interface DrawMenuListLogoMarkOptions {
    opacity?: number;
}

export interface DrawMenuListAttributionOptions {
    activePlanType?: string | null;
    align?: 'left' | 'center' | 'right';
    color?: string;
    font: string;
    gap?: number;
    logoHeight?: number;
    text?: string;
    x: number;
    y: number;
}

export function getMenuListLogoMarkWidth(height: number) {
    return height * MENU_LIST_MARK_WIDTH_RATIO;
}

export function drawMenuListLogoMark(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    height: number,
    options: DrawMenuListLogoMarkOptions = {},
) {
    const scale = height / MENU_LIST_MARK_VIEWBOX.height;
    const pathA = new Path2D(MENU_LIST_MARK_PATH_A);
    const pathB = new Path2D(MENU_LIST_MARK_PATH_B);

    ctx.save();
    ctx.globalAlpha = options.opacity ?? 1;
    ctx.translate(
        x - MENU_LIST_MARK_VIEWBOX.x * scale,
        y - MENU_LIST_MARK_VIEWBOX.y * scale,
    );
    ctx.scale(scale, scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 63.6323;

    const gradientA = ctx.createLinearGradient(1335.95, 845.436, 1784.85, 845.436);
    gradientA.addColorStop(0, '#29AAE3');
    gradientA.addColorStop(0.498958, '#0071BD');
    gradientA.addColorStop(1, '#0051D2');
    ctx.strokeStyle = gradientA;
    ctx.stroke(pathA);

    const gradientB = ctx.createLinearGradient(1595.11, 848.904, 2048.63, 848.904);
    gradientB.addColorStop(0, '#29AAE3');
    gradientB.addColorStop(1, '#0054D0');
    ctx.strokeStyle = gradientB;
    ctx.stroke(pathB);
    ctx.restore();
}

export function drawMenuListAttribution(
    ctx: CanvasRenderingContext2D,
    {
        activePlanType,
        align = 'center',
        color = '#999999',
        font,
        gap = 6,
        logoHeight = 16,
        text = MENU_LIST_ATTRIBUTION_TEXT,
        x,
        y,
    }: DrawMenuListAttributionOptions,
) {
    if (!resolveMenuListAttributionPolicy({ activePlanType }).showAttribution) {
        return 0;
    }

    const logoWidth = getMenuListLogoMarkWidth(logoHeight);

    ctx.save();
    ctx.font = font;
    const textWidth = ctx.measureText(text).width;
    const totalWidth = logoWidth + gap + textWidth;
    const startX = align === 'right' ? x - totalWidth : align === 'left' ? x : x - totalWidth / 2;

    drawMenuListLogoMark(ctx, startX, y - logoHeight / 2, logoHeight);
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, startX + logoWidth + gap, y);
    ctx.restore();

    return totalWidth;
}

export function createMenuListLogoMarkDataUrl(height = 64) {
    const width = Math.round(getMenuListLogoMarkWidth(height));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    drawMenuListLogoMark(ctx, 0, 0, height);

    return {
        dataUrl: canvas.toDataURL('image/png'),
        height,
        width,
    };
}
