import { TENT_CARD_TEMPLATES, TentCardTemplate } from "@type/campaigns";
import { resolveMenuKitBrandTokens } from "@lib/menu-kit/brandTokens";
import { loadLogo } from "@lib/menu-kit/imageLoader";
import {
    createMenuListLogoMarkDataUrl,
    getMenuListLogoMarkWidth,
    MENU_LIST_ATTRIBUTION_TEXT,
} from "@lib/menu-kit/platformAttribution";
import { resolveMenuListAttributionPolicy } from "@lib/platform/menuListBranding";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

interface TentCardOptions {
    activePlanType?: string | null;
    brandColor?: string;
    brandName?: string;
    itemName: string;
    logoUrl?: string;
    templateId: TentCardTemplate;
    qrUrl: string;
    size: "A6" | "A5";
}

function drawMenuListPdfFooter(
    doc: jsPDF,
    x: number,
    y: number,
    color: [number, number, number],
    activePlanType?: string | null,
) {
    if (!resolveMenuListAttributionPolicy({ activePlanType }).showAttribution) {
        return;
    }

    const logoH = 2.8;
    const logoW = getMenuListLogoMarkWidth(logoH);
    const gap = 1.2;

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...color);
    const textW = doc.getTextWidth(MENU_LIST_ATTRIBUTION_TEXT);
    const startX = x - (logoW + gap + textW) / 2;

    try {
        const logo = createMenuListLogoMarkDataUrl();
        doc.addImage(logo.dataUrl, "PNG", startX, y - logoH + 0.6, logoW, logoH);
        doc.text(MENU_LIST_ATTRIBUTION_TEXT, startX + logoW + gap, y);
    } catch {
        doc.text(MENU_LIST_ATTRIBUTION_TEXT, x, y, { align: "center" });
    }
}

/**
 * Generate tent card as PDF
 * Per spec: Client-side generation, no server
 * 
 * Size dimensions:
 * - A6: 105mm × 148mm
 * - A5: 148mm × 210mm
 */
export async function generateTentCardPDF(
    options: TentCardOptions
): Promise<Blob> {
    const { brandColor, brandName, itemName, logoUrl, templateId, qrUrl, size } = options;
    const brand = resolveMenuKitBrandTokens(brandColor);
    const logo = logoUrl ? await loadLogo(logoUrl, 180) : null;

    // Size dimensions in mm
    const dimensions =
        size === "A6" ? { width: 105, height: 148 } : { width: 148, height: 210 };

    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [dimensions.width, dimensions.height],
    });

    doc.setFillColor(...brand.paperRgb);
    doc.rect(0, 0, dimensions.width, dimensions.height, "F");
    doc.setDrawColor(...brand.borderRgb);
    doc.setLineWidth(0.45);
    doc.rect(7, 7, dimensions.width - 14, dimensions.height - 14);
    doc.setFillColor(...brand.softAccentRgb);
    doc.roundedRect(12, 12, dimensions.width - 24, size === "A6" ? 34 : 44, 3, 3, "F");

    // Get template copy
    const template = TENT_CARD_TEMPLATES[templateId];
    const copy = template.replace("{{item_name}}", itemName);

    let textY = size === "A6" ? 34 : 42;
    if (logo) {
        const maxLogoH = size === "A6" ? 12 : 16;
        const maxLogoW = dimensions.width - 44;
        const scale = Math.min(maxLogoW / (logo.width || 1), maxLogoH / (logo.height || 1), 1);
        const logoW = (logo.width || maxLogoW) * scale;
        const logoH = (logo.height || maxLogoH) * scale;
        doc.setFillColor(...brand.surfaceRgb);
        doc.roundedRect(dimensions.width / 2 - logoW / 2 - 4, 16, logoW + 8, logoH + 6, 2, 2, "F");
        doc.addImage(logo.dataUrl, "PNG", dimensions.width / 2 - logoW / 2, 19, logoW, logoH);
        textY = 16 + logoH + (size === "A6" ? 20 : 24);
    }

    // Main copy (centered, large)
    doc.setFontSize(size === "A6" ? 18 : 24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...brand.accentRgb);

    const textLines = doc.splitTextToSize(copy, dimensions.width - 20);
    doc.text(textLines, dimensions.width / 2, textY, { align: "center" });

    // QR Code
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 200,
        margin: 1,
        color: { dark: brand.qrDark, light: brand.qrLight },
        errorCorrectionLevel: "H",
    });

    const qrSize = size === "A6" ? 40 : 50;
    const qrX = (dimensions.width - qrSize) / 2;
    const qrY = dimensions.height - qrSize - 30;

    doc.setFillColor(...brand.surfaceRgb);
    doc.setDrawColor(...brand.borderRgb);
    doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 3, 3, "FD");
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    // Brand footer
    if (brandName) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...brand.mutedRgb);
        doc.text(brandName, dimensions.width / 2, dimensions.height - 13.5, {
            align: "center",
        });
    }

    drawMenuListPdfFooter(doc, dimensions.width / 2, dimensions.height - 7.5, brand.borderRgb, options.activePlanType);

    return doc.output("blob");
}
