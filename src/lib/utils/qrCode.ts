import QRCode from 'qrcode';
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

function fitCanvasText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    font: string,
    minSize: number,
): string {
    const match = font.match(/(\d+)px/);
    const startSize = match ? Number(match[1]) : minSize;
    const fontWithoutSize = font.replace(/\d+px/, '{size}px');
    let size = startSize;
    while (size > minSize) {
        ctx.font = fontWithoutSize.replace('{size}', String(size));
        if (ctx.measureText(text).width <= maxWidth) return ctx.font;
        size -= 2;
    }
    ctx.font = fontWithoutSize.replace('{size}', String(minSize));
    return ctx.font;
}

function truncateCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let output = text;
    while (output.length > 3 && ctx.measureText(`${output}...`).width > maxWidth) {
        output = output.slice(0, -1);
    }
    return `${output}...`;
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
    const qrSize = Math.round(width * 0.58);
    const qrPanel = qrSize + Math.round(width * 0.08);
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

    ctx.fillStyle = brand.accent;
    ctx.fillRect(0, 0, width, Math.round(height * 0.17));

    ctx.strokeStyle = brand.border;
    ctx.lineWidth = 10;
    ctx.strokeRect(margin / 2, margin / 2, width - margin, height - margin);

    let headerY = Math.round(height * 0.11);
    if (options?.logoUrl) {
        const logo = await loadLogo(options.logoUrl, 220);
        if (logo) {
            const maxLogoW = Math.round(width * 0.24);
            const maxLogoH = Math.round(width * 0.1);
            const scale = Math.min(maxLogoW / (logo.width || 1), maxLogoH / (logo.height || 1), 1);
            const logoW = Math.round((logo.width || maxLogoW) * scale);
            const logoH = Math.round((logo.height || maxLogoH) * scale);
            ctx.fillStyle = brand.surface;
            ctx.fillRect(centerX - logoW / 2 - 22, Math.round(height * 0.04) - 16, logoW + 44, logoH + 32);
            ctx.drawImage(logo.element, centerX - logoW / 2, Math.round(height * 0.04), logoW, logoH);
            headerY = Math.round(height * 0.04) + logoH + 58;
        }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (options?.storeName) {
        fitCanvasText(ctx, options.storeName, width - margin * 2, `bold ${Math.round(width * 0.05)}px ${fontBase}`, 34);
        ctx.fillStyle = brand.accentText;
        ctx.fillText(truncateCanvasText(ctx, options.storeName, width - margin * 2), centerX, headerY);
    }

    const qrX = centerX - qrPanel / 2;
    const qrY = Math.round(height * 0.27);
    ctx.fillStyle = brand.surface;
    ctx.fillRect(qrX, qrY, qrPanel, qrPanel);
    ctx.strokeStyle = brand.border;
    ctx.lineWidth = 5;
    ctx.strokeRect(qrX, qrY, qrPanel, qrPanel);

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

    fitCanvasText(ctx, title, width - margin * 2, `bold ${Math.round(width * 0.052)}px ${fontBase}`, 34);
    ctx.fillStyle = brand.text;
    ctx.fillText(truncateCanvasText(ctx, title, width - margin * 2), centerX, Math.round(height * 0.78));

    ctx.font = `${Math.round(width * 0.03)}px ${fontBase}`;
    ctx.fillStyle = brand.muted;
    ctx.fillText(truncateCanvasText(ctx, subtitle, width - margin * 2), centerX, Math.round(height * 0.835));

    ctx.fillStyle = brand.softAccent;
    ctx.fillRect(margin, Math.round(height * 0.89), width - margin * 2, Math.round(width * 0.09));
    ctx.font = `${Math.round(width * 0.024)}px ${fontBase}`;
    ctx.fillStyle = brand.text;
    ctx.fillText(truncateCanvasText(ctx, footer, width - margin * 2 - 48), centerX, Math.round(height * 0.935));

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
