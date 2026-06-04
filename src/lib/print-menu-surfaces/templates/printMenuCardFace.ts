import {
    fillRoundedRect,
    fillRoundedVerticalGradient,
    fitCanvasText,
    strokeRoundedRect,
    truncateCanvasText,
} from '../../menu-kit/canvasPrimitives';
import { type MenuKitBrandTokens } from '../../menu-kit/brandTokens';
import { type PreloadedLogo } from '../../menu-kit/imageLoader';
import { drawMenuListAttribution, MENU_LIST_MENU_ATTRIBUTION_TEXT } from '../../menu-kit/platformAttribution';

export const PRINT_MENU_PX_PER_MM = 300 / 25.4;

export type PrintMenuCardFaceOptions = {
    activePlanType?: string | null;
    brand: MenuKitBrandTokens;
    logo: PreloadedLogo | null;
    menuLabel: string;
    qrCanvas: HTMLCanvasElement;
    shortLink: string;
    storeName: string;
};

export function printMenuMm(value: number): number {
    return Math.round(value * PRINT_MENU_PX_PER_MM);
}

export function drawPrintMenuCardFace(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    opts: PrintMenuCardFaceOptions,
): void {
    const { activePlanType, brand, logo, menuLabel, qrCanvas, shortLink, storeName } = opts;
    const cx = w / 2;
    const fontBase = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const cardX = printMenuMm(7);
    const cardY = printMenuMm(18);
    const cardW = w - cardX * 2;
    const cardH = printMenuMm(118);
    const cardCx = cardX + cardW / 2;

    ctx.fillStyle = brand.paper;
    ctx.fillRect(0, 0, w, h);
    fillRoundedVerticalGradient(
        ctx,
        0,
        0,
        w,
        printMenuMm(48),
        0,
        brand.gradientFrom,
        brand.gradientTo,
    );

    ctx.save();
    ctx.shadowColor = 'rgba(17, 24, 39, 0.14)';
    ctx.shadowBlur = printMenuMm(2.2);
    ctx.shadowOffsetY = printMenuMm(1);
    fillRoundedRect(ctx, cardX, cardY, cardW, cardH, printMenuMm(4), brand.surface);
    ctx.restore();
    strokeRoundedRect(ctx, cardX, cardY, cardW, cardH, printMenuMm(4), brand.border, printMenuMm(0.38));

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let storeY = cardY + printMenuMm(16);
    if (logo) {
        const maxLogoW = printMenuMm(22);
        const maxLogoH = printMenuMm(10);
        const scale = Math.min(maxLogoW / (logo.width || 1), maxLogoH / (logo.height || 1), 1);
        const logoW = Math.round((logo.width || maxLogoW) * scale);
        const logoH = Math.round((logo.height || maxLogoH) * scale);
        ctx.drawImage(logo.element, cardCx - logoW / 2, cardY + printMenuMm(9) - logoH / 2, logoW, logoH);
        storeY += printMenuMm(5);
    }

    fitCanvasText(ctx, storeName, cardW - printMenuMm(12), `800 ${printMenuMm(4.9)}px ${fontBase}`, printMenuMm(3.6));
    ctx.fillStyle = brand.text;
    ctx.fillText(truncateCanvasText(ctx, storeName, cardW - printMenuMm(12)), cardCx, storeY);

    const badgeW = printMenuMm(44);
    const badgeH = printMenuMm(10);
    const badgeY = storeY + printMenuMm(13);
    fillRoundedRect(ctx, cardCx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, printMenuMm(2), brand.softAccent);

    const action = `OUR ${menuLabel}`;
    fitCanvasText(ctx, action, badgeW - printMenuMm(6), `800 ${printMenuMm(5.1)}px ${fontBase}`, printMenuMm(3.8));
    ctx.fillStyle = brand.accent;
    ctx.fillText(truncateCanvasText(ctx, action, badgeW - printMenuMm(6)), cardCx, badgeY);

    ctx.fillStyle = brand.accent;
    ctx.fillRect(cardCx - printMenuMm(22), badgeY + printMenuMm(8), printMenuMm(44), printMenuMm(0.7));

    const qrPanel = printMenuMm(60);
    const qrSize = printMenuMm(52);
    const qrX = cardCx - qrPanel / 2;
    const qrY = cardY + printMenuMm(43);
    ctx.save();
    ctx.shadowColor = 'rgba(17, 24, 39, 0.1)';
    ctx.shadowBlur = printMenuMm(1.4);
    ctx.shadowOffsetY = printMenuMm(0.6);
    fillRoundedRect(ctx, qrX, qrY, qrPanel, qrPanel, printMenuMm(3.4), brand.surface);
    ctx.restore();
    strokeRoundedRect(ctx, qrX, qrY, qrPanel, qrPanel, printMenuMm(2.8), brand.border, printMenuMm(0.5));
    ctx.drawImage(qrCanvas, cardCx - qrSize / 2, qrY + (qrPanel - qrSize) / 2, qrSize, qrSize);

    ctx.font = `500 ${printMenuMm(3.8)}px ${fontBase}`;
    ctx.fillStyle = brand.text;
    ctx.fillText(`Scan to view ${menuLabel.toLowerCase()}`, cardCx, cardY + printMenuMm(111));

    if (shortLink) {
        ctx.font = `${printMenuMm(2.55)}px ${fontBase}`;
        ctx.fillStyle = brand.muted;
        ctx.fillText(truncateCanvasText(ctx, shortLink, cardW - printMenuMm(16)), cardCx, cardY + printMenuMm(114.5));
    }

    drawMenuListAttribution(ctx, {
        activePlanType,
        color: brand.muted,
        font: `${printMenuMm(2.25)}px ${fontBase}`,
        gap: printMenuMm(1),
        logoHeight: printMenuMm(2.45),
        text: MENU_LIST_MENU_ATTRIBUTION_TEXT,
        x: cx,
        y: h - printMenuMm(5.8),
    });
}
