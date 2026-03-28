import { COUNTER_STICKER_TEMPLATES, CounterStickerTemplate } from "@type/campaigns";
import QRCode from "qrcode";

interface StickerOptions {
    itemName: string;
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
    const { itemName, templateId, qrUrl } = options;

    const SIZE = 945; // 80mm at 300dpi
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Border
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, SIZE - 40, SIZE - 40);

    // Main copy
    const template = COUNTER_STICKER_TEMPLATES[templateId];
    ctx.fillStyle = "#000000";
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
    const textStartY = 150;
    lines.forEach((line, i) => {
        ctx.fillText(line, SIZE / 2, textStartY + i * lineHeight);
    });

    // QR Code
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, qrUrl, { width: 300, margin: 1 });

    const qrX = (SIZE - 300) / 2;
    const qrY = SIZE - 350;
    ctx.drawImage(qrCanvas, qrX, qrY);

    // Item name (below QR)
    ctx.font = "32px system-ui";
    ctx.fillStyle = "#666666";
    ctx.fillText(itemName, SIZE / 2, SIZE - 30);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/png");
    });
}
