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
import { drawPrintableThemeArtwork, type PrintableThemeArtwork } from '../../printable-asset-templates/themeArtwork';

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
    themeArtwork?: PrintableThemeArtwork;
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
    templateFamilyId: string,
): void {
    const isRound = templateFamilyId === 'classic-luxe'
        || templateFamilyId === 'executive-dark'
        || templateFamilyId === 'botanical-heritage'
        || templateFamilyId === 'craft-kitchen';
    const radius = isRound ? size / 2 : size * 0.22;
    const inset = isRound ? printMenuMm(0.85) : printMenuMm(1.1);
    const innerRadius = isRound ? (size - inset * 2) / 2 : radius * 0.72;
    const fill = templateFamilyId === 'executive-dark' ? '#0e1116' : brand.surface;
    const innerStroke = templateFamilyId === 'executive-dark' ? 'rgba(255,255,255,0.18)' : brand.paper;

    ctx.save();
    ctx.shadowColor = 'rgba(17, 24, 39, 0.18)';
    ctx.shadowBlur = printMenuMm(1.5);
    ctx.shadowOffsetY = printMenuMm(0.7);
    fillRoundedRect(ctx, cx - size / 2, cy - size / 2, size, size, radius, fill);
    ctx.restore();

    strokeRoundedRect(ctx, cx - size / 2, cy - size / 2, size, size, radius, brand.border, printMenuMm(0.35));
    strokeRoundedRect(ctx, cx - size / 2 + inset, cy - size / 2 + inset, size - inset * 2, size - inset * 2, innerRadius, innerStroke, printMenuMm(0.5));

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

function drawHeaderTreatment(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    brand: MenuKitBrandTokens,
    templateFamilyId: string,
): void {
    const cx = x + w / 2;

    if (templateFamilyId === 'brand-banner') {
        fillRoundedVerticalGradient(
            ctx,
            x,
            y,
            w,
            printMenuMm(28),
            printMenuMm(5),
            brand.gradientFrom,
            brand.gradientTo,
        );
        return;
    }

    if (templateFamilyId === 'local-bold') {
        fillRoundedRect(ctx, cx - w * 0.24, y + printMenuMm(6), w * 0.48, printMenuMm(4.8), printMenuMm(2.4), brand.accent);
        ctx.save();
        ctx.globalAlpha = 0.46;
        drawDiagonalStrips(ctx, x + printMenuMm(12), y + printMenuMm(15), w - printMenuMm(24), brand.border);
        ctx.restore();
        return;
    }

    if (templateFamilyId === 'clean-utility') {
        ctx.strokeStyle = brand.border;
        ctx.lineWidth = printMenuMm(0.3);
        ctx.beginPath();
        ctx.moveTo(x + printMenuMm(8), y + printMenuMm(13));
        ctx.lineTo(cx - printMenuMm(12), y + printMenuMm(13));
        ctx.moveTo(cx + printMenuMm(12), y + printMenuMm(13));
        ctx.lineTo(x + w - printMenuMm(8), y + printMenuMm(13));
        ctx.stroke();
        return;
    }

    if (templateFamilyId === 'executive-dark') {
        ctx.strokeStyle = brand.accent;
        ctx.lineWidth = printMenuMm(0.55);
        ctx.globalAlpha = 0.82;
        ctx.beginPath();
        ctx.moveTo(x + printMenuMm(20), y + printMenuMm(17));
        ctx.lineTo(cx - printMenuMm(14), y + printMenuMm(17));
        ctx.moveTo(cx + printMenuMm(14), y + printMenuMm(17));
        ctx.lineTo(x + w - printMenuMm(20), y + printMenuMm(17));
        ctx.stroke();
        ctx.globalAlpha = 1;
        return;
    }

    if (templateFamilyId === 'classic-luxe') {
        ctx.strokeStyle = brand.border;
        ctx.lineWidth = printMenuMm(0.38);
        ctx.beginPath();
        ctx.moveTo(x + printMenuMm(18), y + printMenuMm(17));
        ctx.lineTo(cx - printMenuMm(16), y + printMenuMm(17));
        ctx.moveTo(cx + printMenuMm(16), y + printMenuMm(17));
        ctx.lineTo(x + w - printMenuMm(18), y + printMenuMm(17));
        ctx.stroke();
        drawDotCluster(ctx, cx - printMenuMm(2.1), y + printMenuMm(15.1), brand.accent);
        return;
    }

    if (templateFamilyId === 'botanical-heritage') {
        ctx.strokeStyle = brand.border;
        ctx.lineWidth = printMenuMm(0.28);
        ctx.globalAlpha = 0.78;
        ctx.beginPath();
        ctx.moveTo(cx - printMenuMm(28), y + printMenuMm(17));
        ctx.lineTo(cx - printMenuMm(14), y + printMenuMm(17));
        ctx.moveTo(cx + printMenuMm(14), y + printMenuMm(17));
        ctx.lineTo(cx + printMenuMm(28), y + printMenuMm(17));
        ctx.stroke();
        ctx.globalAlpha = 1;
        return;
    }

    if (templateFamilyId === 'soft-curve') {
        ctx.save();
        ctx.fillStyle = brand.softAccent;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.ellipse(x + w - printMenuMm(20), y + printMenuMm(14), printMenuMm(28), printMenuMm(8.5), -0.24, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
    }

    if (templateFamilyId === 'qr-first') {
        ctx.strokeStyle = brand.accent;
        ctx.lineWidth = printMenuMm(0.45);
        ctx.beginPath();
        ctx.moveTo(x + printMenuMm(17), y + printMenuMm(12));
        ctx.lineTo(cx - printMenuMm(13), y + printMenuMm(12));
        ctx.moveTo(cx + printMenuMm(13), y + printMenuMm(12));
        ctx.lineTo(x + w - printMenuMm(17), y + printMenuMm(12));
        ctx.stroke();
        return;
    }

    fillRoundedRect(ctx, cx - printMenuMm(19), y + printMenuMm(5.2), printMenuMm(38), printMenuMm(3.2), printMenuMm(1.6), brand.accent);
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

    if (templateFamilyId === 'brand-banner') {
        drawDiagonalStrips(ctx, x + printMenuMm(6), y + printMenuMm(17), w - printMenuMm(12), brand.border);
        return;
    }

    if (templateFamilyId === 'local-bold') {
        ctx.save();
        ctx.fillStyle = brand.accent;
        ctx.globalAlpha = 0.12;
        fillRoundedRect(ctx, x + printMenuMm(4), y + printMenuMm(14), printMenuMm(3), h - printMenuMm(28), printMenuMm(1.5), brand.accent);
        fillRoundedRect(ctx, x + w - printMenuMm(7), y + printMenuMm(14), printMenuMm(3), h - printMenuMm(28), printMenuMm(1.5), brand.accent);
        ctx.restore();
        drawDiagonalStrips(ctx, x + printMenuMm(10), y + h - printMenuMm(32), w - printMenuMm(20), brand.border);
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
    const isClassic = templateFamilyId === 'classic-luxe' || templateFamilyId === 'botanical-heritage' || templateFamilyId === 'craft-kitchen';
    const isSoft = templateFamilyId === 'soft-curve';
    const hasOuterBand = templateFamilyId === 'brand-banner';
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
    if (hasOuterBand) {
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
    } else if (isClassic) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = brand.softAccent;
        ctx.beginPath();
        ctx.ellipse(cx, printMenuMm(9), w * 0.38, printMenuMm(7), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    } else if (isDark) {
        ctx.fillStyle = brand.paper;
        ctx.fillRect(0, 0, w, h);
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
    if (opts.themeArtwork) {
        drawPrintableThemeArtwork(ctx, opts.themeArtwork, { height: cardH, width: cardW, x: cardX, y: cardY }, {
            cornerOpacity: templateFamilyId === 'craft-kitchen' ? 0.35 : 0.30,
            railOpacity: templateFamilyId === 'craft-kitchen' ? 0.28 : 0.24,
            templateFamilyId,
        });
    }
    drawTemplateDecorations(ctx, cardX, cardY, cardW, cardH, brand, templateFamilyId);

    drawHeaderTreatment(ctx, cardX + (templateFamilyId === 'brand-banner' ? 0 : printMenuMm(2)), cardY + printMenuMm(2), cardW - (templateFamilyId === 'brand-banner' ? 0 : printMenuMm(4)), brand, templateFamilyId);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const logoY = cardY + printMenuMm(templateFamilyId === 'brand-banner'
        ? 28
        : templateFamilyId === 'local-bold'
            ? 25
            : isQrFirst
                ? 20
                : isClean
                    ? 19
                    : 22);
    const logoSize = printMenuMm(templateFamilyId === 'brand-banner' ? 17 : isQrFirst ? 12.5 : 16.5);
    drawLogoBadge(ctx, cardCx, logoY, logoSize, brand, logo, storeName, fontBase, templateFamilyId);

    const primaryY = cardY + printMenuMm(templateFamilyId === 'brand-banner'
        ? 47
        : templateFamilyId === 'local-bold'
            ? 43
            : isQrFirst
                ? 36
                : 39.5);
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
    const badgeY = cardY + printMenuMm(isQrFirst ? 53 : templateFamilyId === 'brand-banner' ? 64 : templateFamilyId === 'local-bold' ? 59 : 58);
    fillRoundedRect(ctx, cardCx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, printMenuMm(2), brand.softAccent);
    strokeRoundedRect(ctx, cardCx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, printMenuMm(2), brand.border, printMenuMm(0.26));

    fitCanvasText(ctx, actionLabel, badgeW - printMenuMm(6), `800 ${printMenuMm(isQrFirst ? 4.2 : 5.1)}px ${fontBase}`, printMenuMm(3.6));
    ctx.fillStyle = brand.accent;
    ctx.fillText(truncateCanvasText(ctx, actionLabel, badgeW - printMenuMm(6)), cardCx, badgeY);

    const qrPanel = printMenuMm(isQrFirst ? 56 : templateFamilyId === 'clean-utility' ? 50 : 49);
    const qrSize = printMenuMm(isQrFirst ? 51 : templateFamilyId === 'clean-utility' ? 45 : 44);
    const qrX = cardCx - qrPanel / 2;
    const qrY = cardY + printMenuMm(isQrFirst ? 61 : templateFamilyId === 'brand-banner' ? 71 : templateFamilyId === 'local-bold' ? 68 : 64);
    ctx.save();
    ctx.shadowColor = 'rgba(17, 24, 39, 0.1)';
    ctx.shadowBlur = printMenuMm(1.4);
    ctx.shadowOffsetY = printMenuMm(0.6);
    fillRoundedRect(ctx, qrX, qrY, qrPanel, qrPanel, printMenuMm(4), brand.surface);
    ctx.restore();
    strokeRoundedRect(ctx, qrX, qrY, qrPanel, qrPanel, printMenuMm(4), '#d7dde3', printMenuMm(0.35));
    ctx.drawImage(qrCanvas, cardCx - qrSize / 2, qrY + (qrPanel - qrSize) / 2, qrSize, qrSize);

    const instructionY = cardY + printMenuMm(isQrFirst ? 124 : templateFamilyId === 'brand-banner' ? 124 : templateFamilyId === 'local-bold' ? 122 : 120);
    ctx.font = `600 ${printMenuMm(3.7)}px ${fontBase}`;
    ctx.fillStyle = brand.text;
    ctx.fillText(truncateCanvasText(ctx, instructionLabel, cardW - printMenuMm(16)), cardCx, instructionY);

    if (shortLink) {
        const linkY = cardY + printMenuMm(isQrFirst ? 130 : templateFamilyId === 'brand-banner' ? 131 : templateFamilyId === 'local-bold' ? 129 : 127);
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
        y: h - printMenuMm(4.1),
    });
}
