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
import { normalizePrintableTemplateFamilyId } from '../../printable-asset-templates/templateFamilies';

export const PRINT_MENU_PX_PER_MM = 300 / 25.4;

export type PrintMenuCardFaceOptions = {
    activePlanType?: string | null;
    actionLabel: string;
    brand: MenuKitBrandTokens;
    instructionLabel: string;
    logo: PreloadedLogo | null;
    qrCanvas: HTMLCanvasElement;
    shortLink: string;
    storeName: string;
    templateFamilyId?: string;
};

export function printMenuMm(value: number): number {
    return Math.round(value * PRINT_MENU_PX_PER_MM);
}

type StoreNameParts = {
    primary: string;
    secondary?: string;
};

function splitStoreName(storeName: string): StoreNameParts {
    const cleaned = storeName.replace(/\s+/g, ' ').trim();
    const separatorMatch = cleaned.match(/\s(?:-|\u2013|\u2014|\|)\s/);
    if (!separatorMatch || typeof separatorMatch.index !== 'number') {
        return { primary: cleaned };
    }

    const primary = cleaned.slice(0, separatorMatch.index).trim();
    const secondary = cleaned.slice(separatorMatch.index + separatorMatch[0].length).trim();
    if (!primary || !secondary) return { primary: cleaned };

    return { primary, secondary };
}

function getStoreInitials(storeName: string): string {
    const parts = storeName
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    const initials = parts.map((part) => part.charAt(0).toUpperCase()).join('');
    return initials || 'ML';
}

function drawLogoBadge(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    brand: MenuKitBrandTokens,
    logo: PreloadedLogo | null,
    storeName: string,
    fontBase: string,
): void {
    const radius = size * 0.22;

    ctx.save();
    ctx.shadowColor = 'rgba(17, 24, 39, 0.18)';
    ctx.shadowBlur = printMenuMm(1.5);
    ctx.shadowOffsetY = printMenuMm(0.7);
    fillRoundedRect(ctx, cx - size / 2, cy - size / 2, size, size, radius, brand.surface);
    ctx.restore();

    strokeRoundedRect(ctx, cx - size / 2, cy - size / 2, size, size, radius, brand.border, printMenuMm(0.35));
    strokeRoundedRect(ctx, cx - size / 2 + printMenuMm(1.1), cy - size / 2 + printMenuMm(1.1), size - printMenuMm(2.2), size - printMenuMm(2.2), radius * 0.72, brand.paper, printMenuMm(0.5));

    if (logo) {
        const maxLogoW = size * 0.68;
        const maxLogoH = size * 0.68;
        const scale = Math.min(maxLogoW / (logo.width || 1), maxLogoH / (logo.height || 1), 1);
        const logoW = Math.round((logo.width || maxLogoW) * scale);
        const logoH = Math.round((logo.height || maxLogoH) * scale);
        ctx.drawImage(logo.element, cx - logoW / 2, cy - logoH / 2, logoW, logoH);
        return;
    }

    ctx.font = `800 ${Math.round(size * 0.32)}px ${fontBase}`;
    ctx.fillStyle = brand.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getStoreInitials(storeName), cx, cy + size * 0.02);
}

function drawCornerAccents(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
): void {
    const inset = printMenuMm(3.2);
    const len = printMenuMm(9.5);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = printMenuMm(0.42);
    ctx.globalAlpha = 0.82;
    [
        [x + inset, y + inset, 1, 1],
        [x + w - inset, y + inset, -1, 1],
        [x + inset, y + h - inset, 1, -1],
        [x + w - inset, y + h - inset, -1, -1],
    ].forEach(([cx, cy, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy + sy * len);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + sx * len, cy);
        ctx.stroke();
    });
    ctx.restore();
}

function drawDotCluster(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    const dot = printMenuMm(0.62);
    const gap = printMenuMm(1.8);

    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.62;
    for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
            ctx.beginPath();
            ctx.arc(x + col * gap, y + row * gap, dot, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

function drawLeafSpray(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    flip = false,
): void {
    const direction = flip ? -1 : 1;

    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.46;
    ctx.lineWidth = printMenuMm(0.25);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + direction * printMenuMm(10), y + printMenuMm(18));
    ctx.stroke();

    for (let index = 0; index < 5; index += 1) {
        const leafX = x + direction * printMenuMm(1.9 + index * 1.8);
        const leafY = y + printMenuMm(2.6 + index * 3.2);
        ctx.save();
        ctx.translate(leafX, leafY);
        ctx.rotate(direction * (0.55 + index * 0.08));
        ctx.beginPath();
        ctx.ellipse(0, 0, printMenuMm(1.1), printMenuMm(2.7), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

function drawDiagonalStrips(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    color: string,
): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.52;
    ctx.lineWidth = printMenuMm(0.55);
    for (let index = 0; index < 4; index += 1) {
        const offset = printMenuMm(index * 2.4);
        ctx.beginPath();
        ctx.moveTo(x + offset, y + printMenuMm(8));
        ctx.lineTo(x + printMenuMm(5.8) + offset, y);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x + w - printMenuMm(11), y);
    ctx.lineTo(x + w - printMenuMm(4), y + printMenuMm(8));
    ctx.moveTo(x + w - printMenuMm(7), y);
    ctx.lineTo(x + w, y + printMenuMm(8));
    ctx.stroke();
    ctx.restore();
}

function drawTemplateDecorations(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    brand: MenuKitBrandTokens,
    templateFamilyId: string,
): void {
    if (templateFamilyId === 'clean-utility') {
        drawCornerAccents(ctx, x, y, w, h, brand.border);
        return;
    }

    if (templateFamilyId === 'botanical-heritage') {
        drawCornerAccents(ctx, x, y, w, h, brand.border);
        drawLeafSpray(ctx, x + printMenuMm(8), y + printMenuMm(8), brand.accent);
        drawLeafSpray(ctx, x + w - printMenuMm(8), y + printMenuMm(8), brand.accent, true);
        return;
    }

    if (templateFamilyId === 'classic-luxe') {
        drawCornerAccents(ctx, x, y, w, h, brand.border);
        drawDotCluster(ctx, x + printMenuMm(18), y + h - printMenuMm(28), brand.accent);
        drawDotCluster(ctx, x + w - printMenuMm(23), y + h - printMenuMm(28), brand.accent);
        return;
    }

    if (templateFamilyId === 'executive-dark') {
        drawCornerAccents(ctx, x, y, w, h, brand.border);
        drawDiagonalStrips(ctx, x + printMenuMm(7), y + printMenuMm(49), w - printMenuMm(14), brand.accent);
        return;
    }

    if (templateFamilyId === 'soft-curve') {
        ctx.save();
        ctx.fillStyle = brand.softAccent;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.ellipse(x + w - printMenuMm(17), y + printMenuMm(28), printMenuMm(26), printMenuMm(16), -0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawDotCluster(ctx, x + w - printMenuMm(25), y + h - printMenuMm(32), brand.accent);
        return;
    }

    if (templateFamilyId === 'brand-banner' || templateFamilyId === 'local-bold') {
        drawDiagonalStrips(ctx, x + printMenuMm(6), y + printMenuMm(17), w - printMenuMm(12), brand.border);
        return;
    }

    if (templateFamilyId === 'qr-first') {
        drawCornerAccents(ctx, x, y, w, h, brand.accent);
    }
}

export function drawPrintMenuCardFace(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    opts: PrintMenuCardFaceOptions,
): void {
    const { activePlanType, actionLabel, brand, instructionLabel, logo, qrCanvas, shortLink, storeName } = opts;
    const templateFamilyId = normalizePrintableTemplateFamilyId(opts.templateFamilyId);
    const isClean = templateFamilyId === 'clean-utility';
    const isDark = templateFamilyId === 'executive-dark';
    const isQrFirst = templateFamilyId === 'qr-first';
    const isClassic = templateFamilyId === 'classic-luxe' || templateFamilyId === 'botanical-heritage';
    const isSoft = templateFamilyId === 'soft-curve';
    const cx = w / 2;
    const fontBase = isClassic
        ? 'Georgia, "Times New Roman", serif'
        : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const cardX = printMenuMm(7);
    const cardY = printMenuMm(8);
    const cardW = w - cardX * 2;
    const cardH = printMenuMm(136);
    const cardCx = cardX + cardW / 2;
    const nameParts = splitStoreName(storeName);

    ctx.fillStyle = brand.paper;
    ctx.fillRect(0, 0, w, h);
    if (!isClean) {
        fillRoundedVerticalGradient(
            ctx,
            0,
            0,
            w,
            printMenuMm(isDark ? 62 : 48),
            0,
            brand.gradientFrom,
            brand.gradientTo,
        );
    }
    if (isSoft) {
        ctx.save();
        ctx.globalAlpha = 0.68;
        ctx.fillStyle = brand.softAccent;
        ctx.beginPath();
        ctx.ellipse(w * 0.88, printMenuMm(18), printMenuMm(36), printMenuMm(20), -0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = 'rgba(17, 24, 39, 0.16)';
    ctx.shadowBlur = printMenuMm(2.4);
    ctx.shadowOffsetY = printMenuMm(1.1);
    fillRoundedRect(ctx, cardX, cardY, cardW, cardH, printMenuMm(5), brand.surface);
    ctx.restore();
    strokeRoundedRect(ctx, cardX, cardY, cardW, cardH, printMenuMm(5), brand.border, printMenuMm(0.35));
    drawTemplateDecorations(ctx, cardX, cardY, cardW, cardH, brand, templateFamilyId);

    const headerInset = templateFamilyId === 'brand-banner' || templateFamilyId === 'local-bold' ? 0 : printMenuMm(2);
    const headerH = isClean ? printMenuMm(10) : printMenuMm(templateFamilyId === 'brand-banner' ? 28 : isQrFirst ? 15 : 22);
    if (isClean) {
        ctx.strokeStyle = brand.border;
        ctx.lineWidth = printMenuMm(0.3);
        ctx.beginPath();
        ctx.moveTo(cardX + printMenuMm(8), cardY + headerH);
        ctx.lineTo(cardX + cardW - printMenuMm(8), cardY + headerH);
        ctx.stroke();
    } else {
        fillRoundedVerticalGradient(
            ctx,
            cardX + headerInset,
            cardY + headerInset,
            cardW - headerInset * 2,
            headerH,
            templateFamilyId === 'brand-banner' || templateFamilyId === 'local-bold' ? printMenuMm(5) : printMenuMm(4),
            brand.gradientFrom,
            brand.gradientTo,
        );
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    drawLogoBadge(ctx, cardCx, cardY + printMenuMm(templateFamilyId === 'brand-banner' ? 28 : 22), printMenuMm(isQrFirst ? 14 : 18), brand, logo, storeName, fontBase);

    const primaryY = cardY + printMenuMm(templateFamilyId === 'brand-banner' ? 47 : isQrFirst ? 39 : 41);
    const primaryText = templateFamilyId === 'local-bold' ? nameParts.primary.toUpperCase() : nameParts.primary;
    fitCanvasText(ctx, primaryText, cardW - printMenuMm(12), `800 ${printMenuMm(isClassic ? 6.4 : 5.7)}px ${fontBase}`, printMenuMm(3.7));
    ctx.fillStyle = brand.text;
    ctx.fillText(truncateCanvasText(ctx, primaryText, cardW - printMenuMm(12)), cardCx, primaryY);

    if (nameParts.secondary) {
        fitCanvasText(ctx, nameParts.secondary.toUpperCase(), cardW - printMenuMm(18), `700 ${printMenuMm(3.75)}px ${fontBase}`, printMenuMm(2.8));
        ctx.fillStyle = brand.accent;
        ctx.fillText(truncateCanvasText(ctx, nameParts.secondary.toUpperCase(), cardW - printMenuMm(18)), cardCx, primaryY + printMenuMm(7.5));
    }

    const badgeW = printMenuMm(isQrFirst ? 38 : 44);
    const badgeH = printMenuMm(isQrFirst ? 8 : 10);
    const badgeY = cardY + printMenuMm(isQrFirst ? 55 : templateFamilyId === 'brand-banner' ? 64 : 60);
    fillRoundedRect(ctx, cardCx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, printMenuMm(2), brand.softAccent);
    strokeRoundedRect(ctx, cardCx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, printMenuMm(2), brand.border, printMenuMm(0.26));

    fitCanvasText(ctx, actionLabel, badgeW - printMenuMm(6), `800 ${printMenuMm(isQrFirst ? 4.2 : 5.1)}px ${fontBase}`, printMenuMm(3.6));
    ctx.fillStyle = brand.accent;
    ctx.fillText(truncateCanvasText(ctx, actionLabel, badgeW - printMenuMm(6)), cardCx, badgeY);

    const qrPanel = printMenuMm(isQrFirst ? 60 : templateFamilyId === 'clean-utility' ? 55 : 53);
    const qrSize = printMenuMm(isQrFirst ? 54 : templateFamilyId === 'clean-utility' ? 49 : 47);
    const qrX = cardCx - qrPanel / 2;
    const qrY = cardY + printMenuMm(isQrFirst ? 64 : templateFamilyId === 'brand-banner' ? 70 : 67);
    ctx.save();
    ctx.shadowColor = 'rgba(17, 24, 39, 0.1)';
    ctx.shadowBlur = printMenuMm(1.4);
    ctx.shadowOffsetY = printMenuMm(0.6);
    fillRoundedRect(ctx, qrX, qrY, qrPanel, qrPanel, printMenuMm(4), brand.surface);
    ctx.restore();
    strokeRoundedRect(ctx, qrX, qrY, qrPanel, qrPanel, printMenuMm(4), '#d7dde3', printMenuMm(0.35));
    ctx.drawImage(qrCanvas, cardCx - qrSize / 2, qrY + (qrPanel - qrSize) / 2, qrSize, qrSize);

    const instructionY = cardY + printMenuMm(isQrFirst ? 128 : templateFamilyId === 'brand-banner' ? 128 : 124);
    ctx.font = `600 ${printMenuMm(3.7)}px ${fontBase}`;
    ctx.fillStyle = brand.text;
    ctx.fillText(truncateCanvasText(ctx, instructionLabel, cardW - printMenuMm(16)), cardCx, instructionY);

    if (shortLink) {
        const linkY = cardY + printMenuMm(isQrFirst ? 134 : templateFamilyId === 'brand-banner' ? 136 : 131.5);
        const linkW = cardW - printMenuMm(16);
        const linkH = printMenuMm(7.2);
        fillRoundedRect(ctx, cardCx - linkW / 2, linkY - linkH / 2, linkW, linkH, printMenuMm(1.8), brand.paper);
        strokeRoundedRect(ctx, cardCx - linkW / 2, linkY - linkH / 2, linkW, linkH, printMenuMm(1.8), brand.border, printMenuMm(0.24));
        ctx.font = `${printMenuMm(2.45)}px ${fontBase}`;
        ctx.fillStyle = brand.muted;
        ctx.fillText(truncateCanvasText(ctx, shortLink, linkW - printMenuMm(5)), cardCx, linkY);
    }

    drawMenuListAttribution(ctx, {
        activePlanType,
        color: brand.muted,
        font: `${printMenuMm(2.25)}px ${fontBase}`,
        gap: printMenuMm(1),
        logoHeight: printMenuMm(2.45),
        text: MENU_LIST_MENU_ATTRIBUTION_TEXT,
        x: cx,
        y: h - printMenuMm(2.8),
    });
}
