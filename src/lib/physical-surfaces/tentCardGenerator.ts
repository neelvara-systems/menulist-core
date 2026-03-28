import { TENT_CARD_TEMPLATES, TentCardTemplate } from "@type/campaigns";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

interface TentCardOptions {
    itemName: string;
    templateId: TentCardTemplate;
    qrUrl: string;
    size: "A6" | "A5";
    brandName?: string;
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
    const { itemName, templateId, qrUrl, size, brandName } = options;

    // Size dimensions in mm
    const dimensions =
        size === "A6" ? { width: 105, height: 148 } : { width: 148, height: 210 };

    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [dimensions.width, dimensions.height],
    });

    // Get template copy
    const template = TENT_CARD_TEMPLATES[templateId];
    const copy = template.replace("{{item_name}}", itemName);

    // Main copy (centered, large)
    doc.setFontSize(size === "A6" ? 18 : 24);
    doc.setFont("helvetica", "bold");

    const textLines = doc.splitTextToSize(copy, dimensions.width - 20);
    const textY = 40;
    doc.text(textLines, dimensions.width / 2, textY, { align: "center" });

    // QR Code
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 200,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
    });

    const qrSize = size === "A6" ? 40 : 50;
    const qrX = (dimensions.width - qrSize) / 2;
    const qrY = dimensions.height - qrSize - 30;

    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    // Brand footer
    if (brandName) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(128);
        doc.text(brandName, dimensions.width / 2, dimensions.height - 10, {
            align: "center",
        });
    }

    return doc.output("blob");
}
