import { COUNTER_STICKER_TEMPLATES, CounterStickerTemplate } from "@type/campaigns";
import { resolveMenuKitBrandTokens } from "@lib/menu-kit/brandTokens";
import { loadLogo } from "@lib/menu-kit/imageLoader";
import { drawMenuListAttribution } from "@lib/menu-kit/platformAttribution";
import QRCode from "qrcode";

interface StickerOptions {
    activePlanType?: string | null;
    brandColor?: string;
    brandName?: string;
    itemName: string;
    logoUrl?: string;
    templateId: CounterStickerTemplate;
    qrUrl: string;
}

/**
 * Generate counter sticker as PNG
 * Per spec: 80mm × 80mm at 300dpi = 945px
 * Client-side canvas generation, no server
 */
export async function generateStickerPNG(
    options: StickerOptions
): Promise<Blob> {
    const { brandColor, brandName, itemName, logoUrl, templateId, qrUrl } = options;
    const brand = resolveMenuKitBrandTokens(brandColor);
    const logo = logoUrl ? await loadLogo(logoUrl, 180) : null;

    const SIZE = 945; // 80mm at 300dpi
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }

    // Premium paper background
    ctx.fillStyle = brand.paper;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Border
    ctx.strokeStyle = brand.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, SIZE - 40, SIZE - 40);

    ctx.fillStyle = brand.softAccent;
    ctx.fillRect(46, 46, SIZE - 92, 220);

    // Main copy
    const template = COUNTER_STICKER_TEMPLATES[templateId];
    ctx.fillStyle = brand.accent;
    ctx.font = "bold 48px system-ui";
    ctx.textAlign = "center";

    // Word wrap
    const maxWidth = SIZE - 100;
    const words = template.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidth) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);

    const lineHeight = 60;
    const textStartY = 120;
    lines.forEach((line, i) => {
        ctx.fillText(line, SIZE / 2, textStartY + i * lineHeight);
    });

    if (logo) {
        const maxLH = 44;
        const maxLW = 140;
        const scale = Math.min(maxLW / (logo.width || 1), maxLH / (logo.height || 1), 1);
        const lw = Math.round((logo.width || 90) * scale);
        const lh = Math.round((logo.height || 44) * scale);
        const logoY = 292;
        ctx.fillStyle = brand.surface;
        ctx.fillRect(SIZE / 2 - lw / 2 - 16, logoY - 10, lw + 32, lh + 20);
        ctx.drawImage(logo.element, SIZE / 2 - lw / 2, logoY, lw, lh);
    }

    // QR Code
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, qrUrl, {
        width: 300,
        margin: 4,
        color: { dark: brand.qrDark, light: brand.qrLight },
        errorCorrectionLevel: "H",
    });

    const qrX = (SIZE - 300) / 2;
    const qrY = 390;
    ctx.fillStyle = brand.surface;
    ctx.fillRect(qrX - 26, qrY - 26, 352, 352);
    ctx.strokeStyle = brand.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(qrX - 26, qrY - 26, 352, 352);
    ctx.drawImage(qrCanvas, qrX, qrY);

    // Item name (below QR)
    ctx.font = "32px system-ui";
    ctx.fillStyle = brand.text;
    ctx.fillText(itemName, SIZE / 2, SIZE - 92);

    if (brandName) {
        ctx.font = "22px system-ui";
        ctx.fillStyle = brand.muted;
        ctx.fillText(brandName, SIZE / 2, SIZE - 50);
    }

    drawMenuListAttribution(ctx, {
        activePlanType: options.activePlanType,
        color: brand.border,
        font: "16px system-ui, -apple-system, sans-serif",
        gap: 5,
        logoHeight: 14,
        x: SIZE / 2,
        y: SIZE - 22,
    });

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/png");
    });
}
