import QRCode from 'qrcode';
import {
    fillRoundedRect,
    fillRoundedVerticalGradient,
    fillVerticalGradient,
    fitCanvasText,
    strokeRoundedRect,
    truncateCanvasText,
} from '@lib/menu-kit/canvasPrimitives';
import { resolveMenuKitBrandTokens } from '@lib/menu-kit/brandTokens';
import { loadLogo } from '@lib/menu-kit/imageLoader';
import { drawMenuListAttribution } from '@lib/menu-kit/platformAttribution';
import { normalizePrintableTemplateFamilyId } from '@lib/printable-asset-templates/templateFamilies';
import { resolvePrintableTemplateBrandTokens } from '@lib/printable-asset-templates/templateStyles';

export interface QrCodeOptions {
    width?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
}

export interface BrandedQrCodeOptions extends QrCodeOptions {
    activePlanType?: string | null;
    brandColor?: string | null;
    footer?: string;
    logoUrl?: string | null;
    storeName?: string;
    subtitle?: string;
    templateFamilyId?: string;
    title?: string;
}

export async function generateQrCodeDataUrl(
    value: string,
    options?: QrCodeOptions
): Promise<string> {
    return await QRCode.toDataURL(value, {
        width: options?.width || 1024,
        margin: options?.margin || 2,
        color: {
            dark: options?.darkColor || '#000000',
            light: options?.lightColor || '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
    });
}

type StoreNameParts = {
    primary: string;
    secondary?: string;
};

function splitStoreName(storeName?: string): StoreNameParts | null {
    const cleaned = storeName?.replace(/\s+/g, ' ').trim();
    if (!cleaned) return null;

    const separatorMatch = cleaned.match(/\s(?:-|\u2013|\u2014|\|)\s/);
    if (!separatorMatch || typeof separatorMatch.index !== 'number') {
        return { primary: cleaned };
    }

    const primary = cleaned.slice(0, separatorMatch.index).trim();
    const secondary = cleaned.slice(separatorMatch.index + separatorMatch[0].length).trim();
    if (!primary || !secondary) return { primary: cleaned };

    return { primary, secondary };
}

function getStoreInitials(storeName?: string): string {
    const parts = (storeName || '')
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
    brand: ReturnType<typeof resolveMenuKitBrandTokens>,
    logo: Awaited<ReturnType<typeof loadLogo>>,
    storeName: string | undefined,
    fontBase: string,
): void {
    const radius = Math.round(size * 0.22);

    ctx.save();
    ctx.shadowColor = 'rgba(17, 24, 39, 0.18)';
    ctx.shadowBlur = Math.round(size * 0.16);
    ctx.shadowOffsetY = Math.round(size * 0.06);
    fillRoundedRect(ctx, cx - size / 2, cy - size / 2, size, size, radius, brand.surface);
    ctx.restore();

    strokeRoundedRect(ctx, cx - size / 2, cy - size / 2, size, size, radius, brand.border, Math.max(2, Math.round(size * 0.025)));
    strokeRoundedRect(ctx, cx - size / 2 + size * 0.09, cy - size / 2 + size * 0.09, size * 0.82, size * 0.82, Math.round(radius * 0.72), brand.paper, Math.max(2, Math.round(size * 0.018)));

    if (logo) {
        const maxLogoW = Math.round(size * 0.68);
        const maxLogoH = Math.round(size * 0.68);
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

function drawQrCornerAccents(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    unit: number,
): void {
    const inset = unit * 3.1;
    const len = unit * 8.8;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, unit * 0.42);
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

function drawQrDotCluster(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    unit: number,
): void {
    const radius = unit * 0.62;
    const gap = unit * 1.8;

    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;
    for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
            ctx.beginPath();
            ctx.arc(x + col * gap, y + row * gap, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

function drawQrLeafSpray(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    unit: number,
    flip = false,
): void {
    const direction = flip ? -1 : 1;

    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.44;
    ctx.lineWidth = Math.max(1.5, unit * 0.22);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + direction * unit * 10, y + unit * 18);
    ctx.stroke();
    for (let index = 0; index < 5; index += 1) {
        ctx.save();
        ctx.translate(x + direction * unit * (1.9 + index * 1.8), y + unit * (2.6 + index * 3.2));
        ctx.rotate(direction * (0.55 + index * 0.08));
        ctx.beginPath();
        ctx.ellipse(0, 0, unit * 1.1, unit * 2.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

function drawQrDiagonalStrips(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    color: string,
    unit: number,
): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = Math.max(2, unit * 0.5);
    for (let index = 0; index < 4; index += 1) {
        const offset = unit * index * 2.4;
        ctx.beginPath();
        ctx.moveTo(x + offset, y + unit * 8);
        ctx.lineTo(x + unit * 5.8 + offset, y);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x + w - unit * 11, y);
    ctx.lineTo(x + w - unit * 4, y + unit * 8);
    ctx.moveTo(x + w - unit * 7, y);
    ctx.lineTo(x + w, y + unit * 8);
    ctx.stroke();
    ctx.restore();
}

function drawQrTemplateDecorations(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    brand: ReturnType<typeof resolveMenuKitBrandTokens>,
    templateFamilyId: string,
    unit: number,
): void {
    if (templateFamilyId === 'clean-utility') {
        drawQrCornerAccents(ctx, x, y, w, h, brand.border, unit);
        return;
    }

    if (templateFamilyId === 'botanical-heritage') {
        drawQrCornerAccents(ctx, x, y, w, h, brand.border, unit);
        drawQrLeafSpray(ctx, x + unit * 8, y + unit * 8, brand.accent, unit);
        drawQrLeafSpray(ctx, x + w - unit * 8, y + unit * 8, brand.accent, unit, true);
        return;
    }

    if (templateFamilyId === 'classic-luxe') {
        drawQrCornerAccents(ctx, x, y, w, h, brand.border, unit);
        drawQrDotCluster(ctx, x + unit * 18, y + h - unit * 28, brand.accent, unit);
        drawQrDotCluster(ctx, x + w - unit * 23, y + h - unit * 28, brand.accent, unit);
        return;
    }

    if (templateFamilyId === 'executive-dark') {
        drawQrCornerAccents(ctx, x, y, w, h, brand.border, unit);
        drawQrDiagonalStrips(ctx, x + unit * 7, y + unit * 40, w - unit * 14, brand.accent, unit);
        return;
    }

    if (templateFamilyId === 'soft-curve') {
        ctx.save();
        ctx.fillStyle = brand.softAccent;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.ellipse(x + w - unit * 17, y + unit * 27, unit * 27, unit * 16, -0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawQrDotCluster(ctx, x + w - unit * 25, y + h - unit * 34, brand.accent, unit);
        return;
    }

    if (templateFamilyId === 'brand-banner' || templateFamilyId === 'local-bold') {
        drawQrDiagonalStrips(ctx, x + unit * 6, y + unit * 17, w - unit * 12, brand.border, unit);
        return;
    }

    if (templateFamilyId === 'qr-first') {
        drawQrCornerAccents(ctx, x, y, w, h, brand.accent, unit);
    }
}

export async function generateBrandedQrCodeDataUrl(
    value: string,
    options?: BrandedQrCodeOptions,
): Promise<string> {
    if (typeof document === 'undefined') {
        return generateQrCodeDataUrl(value, options);
    }

    const templateFamilyId = normalizePrintableTemplateFamilyId(options?.templateFamilyId);
    const brand = resolvePrintableTemplateBrandTokens(options?.brandColor, templateFamilyId);
    const width = options?.width || 1200;
    const height = Math.round(width * 1.5);
    const margin = Math.round(width * 0.06);
    const qrSize = Math.round(width * 0.48);
    const qrPanel = qrSize + Math.round(width * 0.07);
    const centerX = width / 2;
    const fontBase = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const title = options?.title || 'Scan to open';
    const subtitle = options?.subtitle || 'Open camera and point at the QR';
    const footer = options?.footer || value.replace(/^https?:\/\//, '');
    const nameParts = splitStoreName(options?.storeName);
    let logo: Awaited<ReturnType<typeof loadLogo>> = null;
    if (options?.logoUrl) {
        logo = await loadLogo(options.logoUrl, 220);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.fillStyle = brand.paper;
    ctx.fillRect(0, 0, width, height);
    if (templateFamilyId === 'clean-utility') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    } else {
        fillVerticalGradient(ctx, 0, 0, width, Math.round(height * 0.46), brand.gradientFrom, brand.gradientTo);
    }

    const cardX = margin;
    const cardY = Math.round(width * 0.1);
    const cardW = width - margin * 2;
    const cardH = height - cardY - Math.round(width * 0.09);
    const cardRadius = Math.round(width * 0.034);

    ctx.shadowColor = 'rgba(17, 24, 39, 0.16)';
    ctx.shadowBlur = Math.round(width * 0.04);
    ctx.shadowOffsetY = Math.round(width * 0.02);
    fillRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius, brand.surface);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    strokeRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius, brand.border, Math.max(2, Math.round(width * 0.003)));
    drawQrTemplateDecorations(ctx, cardX, cardY, cardW, cardH, brand, templateFamilyId, width / 100);

    if (templateFamilyId === 'qr-first' || templateFamilyId === 'clean-utility') {
        ctx.fillStyle = templateFamilyId === 'qr-first' ? brand.softAccent : '#ffffff';
        ctx.fillRect(cardX + Math.round(width * 0.03), cardY + Math.round(width * 0.03), cardW - Math.round(width * 0.06), Math.round(width * 0.08));
    } else {
        fillRoundedVerticalGradient(
            ctx,
            cardX + Math.round(width * 0.03),
            cardY + Math.round(width * 0.03),
            cardW - Math.round(width * 0.06),
            Math.round(width * 0.15),
            Math.round(width * 0.028),
            brand.gradientFrom,
            brand.gradientTo,
        );
    }

    const badgeSize = Math.round(width * 0.13);
    const badgeY = cardY + Math.round(width * 0.17);
    if (logo || nameParts) {
        drawLogoBadge(ctx, centerX, badgeY, badgeSize, brand, logo, options?.storeName, fontBase);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let headerY = nameParts ? cardY + Math.round(width * 0.28) : cardY + Math.round(width * 0.19);
    if (nameParts) {
        fitCanvasText(ctx, nameParts.primary, cardW - margin, `800 ${Math.round(width * 0.047)}px ${fontBase}`, Math.round(width * 0.03));
        ctx.fillStyle = brand.text;
        ctx.fillText(truncateCanvasText(ctx, nameParts.primary, cardW - margin), centerX, headerY);

        if (nameParts.secondary) {
            headerY += Math.round(width * 0.055);
            fitCanvasText(ctx, nameParts.secondary.toUpperCase(), cardW - margin * 1.6, `700 ${Math.round(width * 0.035)}px ${fontBase}`, Math.round(width * 0.024));
            ctx.fillStyle = brand.accent;
            ctx.fillText(truncateCanvasText(ctx, nameParts.secondary.toUpperCase(), cardW - margin * 1.6), centerX, headerY);
        }

        headerY += Math.round(width * 0.095);
    }

    ctx.font = `800 ${Math.round(width * 0.038)}px ${fontBase}`;
    const titlePillW = Math.min(cardW - margin, Math.max(Math.round(width * 0.36), Math.round(ctx.measureText(title).width + width * 0.12)));
    const titlePillH = Math.round(width * 0.07);
    fillRoundedVerticalGradient(
        ctx,
        centerX - titlePillW / 2,
        headerY - titlePillH / 2,
        titlePillW,
        titlePillH,
        Math.round(width * 0.02),
        brand.softAccent,
        '#ffffff',
    );
    fitCanvasText(ctx, title, titlePillW - Math.round(width * 0.08), `800 ${Math.round(width * 0.038)}px ${fontBase}`, Math.round(width * 0.026));
    ctx.fillStyle = brand.accent;
    ctx.fillText(truncateCanvasText(ctx, title, titlePillW - Math.round(width * 0.08)), centerX, headerY);

    const qrX = centerX - qrPanel / 2;
    const qrY = Math.round(headerY + width * 0.075);
    fillRoundedRect(ctx, qrX, qrY, qrPanel, qrPanel, Math.round(width * 0.018), brand.surface);
    strokeRoundedRect(ctx, qrX, qrY, qrPanel, qrPanel, Math.round(width * 0.018), '#d7dde3', Math.max(2, Math.round(width * 0.002)));

    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, value, {
        width: qrSize,
        margin: options?.margin ?? 2,
        color: {
            dark: options?.darkColor || brand.qrDark,
            light: options?.lightColor || brand.qrLight,
        },
        errorCorrectionLevel: 'H',
    });
    ctx.drawImage(qrCanvas, centerX - qrSize / 2, qrY + (qrPanel - qrSize) / 2, qrSize, qrSize);

    const instructionY = qrY + qrPanel + Math.round(width * 0.06);
    fitCanvasText(ctx, subtitle, cardW - margin, `500 ${Math.round(width * 0.03)}px ${fontBase}`, Math.round(width * 0.022));
    ctx.fillStyle = brand.text;
    ctx.fillText(truncateCanvasText(ctx, subtitle, cardW - margin), centerX, instructionY);

    const linkY = instructionY + Math.round(width * 0.07);
    const linkPillH = Math.round(width * 0.065);
    fillRoundedRect(ctx, cardX + margin / 2, linkY - linkPillH / 2, cardW - margin, linkPillH, Math.round(width * 0.018), brand.paper);
    strokeRoundedRect(ctx, cardX + margin / 2, linkY - linkPillH / 2, cardW - margin, linkPillH, Math.round(width * 0.018), brand.border, 2);
    ctx.font = `${Math.round(width * 0.024)}px ${fontBase}`;
    ctx.fillStyle = brand.muted;
    ctx.fillText(truncateCanvasText(ctx, footer, cardW - margin * 2), centerX, linkY);

    ctx.strokeStyle = brand.border;
    ctx.lineWidth = Math.max(1, Math.round(width * 0.0015));
    ctx.beginPath();
    ctx.moveTo(cardX + margin, height - Math.round(width * 0.07));
    ctx.lineTo(cardX + cardW - margin, height - Math.round(width * 0.07));
    ctx.stroke();

    drawMenuListAttribution(ctx, {
        activePlanType: options?.activePlanType,
        color: brand.muted,
        font: `${Math.round(width * 0.018)}px ${fontBase}`,
        gap: Math.round(width * 0.008),
        logoHeight: Math.round(width * 0.018),
        x: centerX,
        y: height - Math.round(width * 0.034),
    });

    return canvas.toDataURL('image/png');
}

export function downloadQrCode(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function buildQrCodeFilename(label: string, suffix = 'qr'): string {
    const sanitized = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return `${sanitized}-${suffix}`;
}
