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

export async function generateBrandedQrCodeDataUrl(
    value: string,
    options?: BrandedQrCodeOptions,
): Promise<string> {
    if (typeof document === 'undefined') {
        return generateQrCodeDataUrl(value, options);
    }

    const brand = resolveMenuKitBrandTokens(options?.brandColor);
    const width = options?.width || 1200;
    const height = Math.round(width * 1.28);
    const margin = Math.round(width * 0.06);
    const qrSize = Math.round(width * 0.52);
    const qrPanel = qrSize + Math.round(width * 0.07);
    const centerX = width / 2;
    const fontBase = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const title = options?.title || 'Scan to open';
    const subtitle = options?.subtitle || 'Open camera and point at the QR';
    const footer = options?.footer || value.replace(/^https?:\/\//, '');

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.fillStyle = brand.paper;
    ctx.fillRect(0, 0, width, height);
    fillVerticalGradient(ctx, 0, 0, width, Math.round(height * 0.46), brand.gradientFrom, brand.gradientTo);

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

    let headerY = cardY + Math.round(width * 0.09);
    if (options?.logoUrl) {
        const logo = await loadLogo(options.logoUrl, 220);
        if (logo) {
            const maxLogoW = Math.round(width * 0.2);
            const maxLogoH = Math.round(width * 0.095);
            const scale = Math.min(maxLogoW / (logo.width || 1), maxLogoH / (logo.height || 1), 1);
            const logoW = Math.round((logo.width || maxLogoW) * scale);
            const logoH = Math.round((logo.height || maxLogoH) * scale);
            const logoBoxW = logoW + Math.round(width * 0.045);
            const logoBoxH = logoH + Math.round(width * 0.035);
            fillRoundedRect(ctx, centerX - logoBoxW / 2, headerY - logoBoxH / 2, logoBoxW, logoBoxH, Math.round(width * 0.014), brand.paper);
            strokeRoundedRect(ctx, centerX - logoBoxW / 2, headerY - logoBoxH / 2, logoBoxW, logoBoxH, Math.round(width * 0.014), brand.border, 2);
            ctx.drawImage(logo.element, centerX - logoW / 2, headerY - logoH / 2, logoW, logoH);
            headerY += logoBoxH / 2 + Math.round(width * 0.05);
        }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (options?.storeName) {
        fitCanvasText(ctx, options.storeName, cardW - margin, `700 ${Math.round(width * 0.046)}px ${fontBase}`, Math.round(width * 0.028));
        ctx.fillStyle = brand.text;
        ctx.fillText(truncateCanvasText(ctx, options.storeName, cardW - margin), centerX, headerY);
        headerY += Math.round(width * 0.072);
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
    const qrY = Math.round(headerY + width * 0.07);
    fillRoundedRect(ctx, qrX, qrY, qrPanel, qrPanel, Math.round(width * 0.018), brand.surface);
    strokeRoundedRect(ctx, qrX, qrY, qrPanel, qrPanel, Math.round(width * 0.018), brand.border, Math.max(3, Math.round(width * 0.003)));

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
