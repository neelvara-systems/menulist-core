import { jsPDF } from 'jspdf';
import type { MenuCardGeneratedArtifact, MenuCardExportSettings, MenuCardSafeOverrides } from '../models/exportTypes';
import type { MenuCardPrintSource, PrintCategory, PrintItem } from '../models/printModel';
import { getMenuCardTemplate } from '../templates/registry';
import { buildPrintSourceHash } from '../source/buildPrintSourceHash';
import { applySafeLayoutOverrides } from '../overrides/applySafeLayoutOverrides';
import { getPrintBox } from './renderPrintBoxes';
import { renderQr } from './renderQr';

function safeFilename(value: string): string {
    return (value || 'menu')
        .replace(/[^a-zA-Z0-9\s_-]/g, '')
        .trim()
        .replace(/\s+/g, '_') || 'menu';
}

function hexToRgb(hex: string): [number, number, number] {
    const clean = (hex || '#2d2d2d').replace('#', '');
    const value = /^[0-9a-fA-F]{6}$/.test(clean) ? clean : '2d2d2d';
    return [
        parseInt(value.slice(0, 2), 16),
        parseInt(value.slice(2, 4), 16),
        parseInt(value.slice(4, 6), 16),
    ];
}

function formatPrice(price: string | undefined, currency: string): string {
    if (!price) return '';
    const normalized = Number(price);
    if (Number.isFinite(normalized)) {
        return currency ? `${currency} ${normalized.toFixed(2)}` : normalized.toFixed(2);
    }
    return currency && !price.includes(currency) ? `${currency} ${price}` : price;
}

function getFormat(settings: MenuCardExportSettings): 'a4' | 'a5' | 'letter' {
    return settings.paperSize === 'letter' ? 'letter' : settings.paperSize;
}

function getColumnCount(settings: MenuCardExportSettings): number {
    if (settings.preset === 'whatsapp' || settings.styleId === 'premium') return 1;
    if (settings.styleId === 'compact' && settings.paperSize === 'a4') return 3;
    return 2;
}

function getFontSizes(settings: MenuCardExportSettings) {
    if (settings.density === 'compact') {
        return { item: 8.5, description: 7, category: 10, gap: 3.6 };
    }
    if (settings.density === 'comfortable') {
        return { item: 11, description: 8.5, category: 13, gap: 5.2 };
    }
    return { item: 9.8, description: 7.8, category: 11.5, gap: 4.4 };
}

function itemHeight(doc: jsPDF, item: PrintItem, width: number, settings: MenuCardExportSettings): number {
    const sizes = getFontSizes(settings);
    const desc = settings.includeDescriptions ? item.description || '' : '';
    const descLines = desc ? (doc.splitTextToSize(desc, width - 4) as string[]).length : 0;
    return sizes.gap + descLines * 3.3 + item.attributes.length * 3.4 + 3;
}

function drawHeader(doc: jsPDF, source: MenuCardPrintSource, settings: MenuCardExportSettings, pageWidth: number): number {
    const [r, g, b] = hexToRgb(source.business.brandTokens.accentColor);
    const hasContact = settings.includeContactBlock && !!(source.business.address || source.business.phone);
    const headerHeight = hasContact ? 30 : 24;

    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(settings.preset === 'whatsapp' ? 18 : 20);
    doc.text(source.business.name.toUpperCase(), pageWidth / 2, 13, { align: 'center' });

    if (hasContact) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(230, 230, 230);
        const contact = [source.business.address, source.business.phone].filter(Boolean).join('  |  ');
        doc.text(contact, pageWidth / 2, 22, { align: 'center', maxWidth: pageWidth - 24 });
    }

    return headerHeight + 8;
}

function drawFooter(
    doc: jsPDF,
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    sourceHash: string,
    qrDataUrl: string | null,
) {
    const total = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 12;

    for (let page = 1; page <= total; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.25);
        doc.line(12, footerY - 8, pageWidth - 12, footerY - 8);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(7);
        doc.text(sourceHash, 12, footerY, { align: 'left' });
        doc.text(`Page ${page} of ${total}`, pageWidth / 2, footerY, { align: 'center' });

        if (settings.includeUpdatedDate) {
            const updated = source.menu.updatedAt ? new Date(source.menu.updatedAt).toLocaleDateString() : new Date().toLocaleDateString();
            doc.text(`Menu Updated: ${updated}`, pageWidth - 12, footerY, { align: 'right' });
        }

        if (page === 1 && settings.includeQr && qrDataUrl) {
            const qrSize = settings.preset === 'whatsapp' ? 22 : 20;
            doc.addImage(qrDataUrl, 'PNG', 12, pageHeight - 42, qrSize, qrSize);
            doc.setFontSize(7);
            doc.setTextColor(80, 80, 80);
            doc.text(source.qr.label, 36, pageHeight - 32);
            doc.setTextColor(120, 120, 120);
            doc.text(source.qr.shortUrl || source.business.publicMenuUrl, 36, pageHeight - 27, { maxWidth: pageWidth - 50 });
        }
    }
}

function drawCategoryTitle(doc: jsPDF, category: PrintCategory, x: number, y: number, width: number, settings: MenuCardExportSettings) {
    const sizes = getFontSizes(settings);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sizes.category);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(category.name.toUpperCase(), width) as string[];
    lines.slice(0, 2).forEach((line, index) => {
        doc.text(line, x, y + index * 4.5);
    });
    doc.setDrawColor(90, 90, 90);
    doc.setLineWidth(0.25);
    doc.line(x, y + 3 + Math.max(0, lines.length - 1) * 4.5, x + width, y + 3 + Math.max(0, lines.length - 1) * 4.5);
    return y + 8 + Math.max(0, lines.length - 1) * 4.5;
}

function drawItem(doc: jsPDF, item: PrintItem, x: number, y: number, width: number, source: MenuCardPrintSource, settings: MenuCardExportSettings): number {
    const sizes = getFontSizes(settings);
    const price = formatPrice(item.price, source.menu.currency);
    const priceWidth = 22;
    const nameWidth = width - priceWidth - 2;
    const nameLines = doc.splitTextToSize(item.name, nameWidth) as string[];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sizes.item);
    doc.setTextColor(30, 30, 30);
    doc.text(nameLines[0] || item.name, x, y);

    if (price) {
        doc.setFont('helvetica', 'normal');
        doc.text(price, x + width, y, { align: 'right' });
    }

    let nextY = y + sizes.gap;

    if (settings.includeDescriptions && item.description) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(sizes.description);
        doc.setTextColor(100, 100, 100);
        const descLines = doc.splitTextToSize(item.description, width - 4) as string[];
        descLines.slice(0, settings.density === 'compact' ? 2 : 4).forEach((line) => {
            doc.text(line, x + 3, nextY);
            nextY += 3.3;
        });
    }

    if (item.attributes.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(sizes.description);
        doc.setTextColor(115, 115, 115);
        item.attributes.slice(0, 6).forEach((attribute) => {
            const attrPrice = formatPrice(attribute.price, source.menu.currency);
            doc.text(`- ${attribute.name}${attrPrice ? `  ${attrPrice}` : ''}`, x + 3, nextY);
            nextY += 3.4;
        });
    }

    return nextY + 2;
}

export async function renderPdf(
    source: MenuCardPrintSource,
    settings: MenuCardExportSettings,
    overrides: MenuCardSafeOverrides = {},
): Promise<MenuCardGeneratedArtifact> {
    const template = getMenuCardTemplate(settings.styleId);
    const sourceHash = buildPrintSourceHash(source, settings, overrides);
    const categories = applySafeLayoutOverrides(source.menu.categories, overrides);
    const doc = new jsPDF({ orientation: settings.orientation, unit: 'mm', format: getFormat(settings) });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const printBox = getPrintBox(settings);
    const margin = printBox.safeMargin;
    const footerReserve = printBox.footerReserve;
    const contentBottom = pageHeight - footerReserve - 14;
    const columns = Math.max(1, Math.min(template.columns, getColumnCount(settings)));
    const gutter = columns > 1 ? 8 : 0;
    const columnWidth = (pageWidth - margin * 2 - gutter * (columns - 1)) / columns;
    const qrDataUrl = settings.includeQr ? await renderQr(source.qr.destinationUrl, source.qr.errorCorrection) : null;

    let y = drawHeader(doc, source, settings, pageWidth);
    let columnIndex = 0;

    const nextColumnOrPage = () => {
        if (columnIndex < columns - 1) {
            columnIndex += 1;
            y = margin + 4;
        } else {
            doc.addPage();
            columnIndex = 0;
            y = margin + 4;
        }
    };

    const columnX = () => margin + columnIndex * (columnWidth + gutter);

    categories.forEach((category) => {
        const estimatedCategoryHeight = 10 + category.items.reduce((sum, item) => sum + itemHeight(doc, item, columnWidth, settings), 0);
        if (estimatedCategoryHeight < (contentBottom - margin) && y + Math.min(estimatedCategoryHeight, 40) > contentBottom) {
            nextColumnOrPage();
        }

        y = drawCategoryTitle(doc, category, columnX(), y, columnWidth, settings);

        category.items.forEach((item) => {
            const height = itemHeight(doc, item, columnWidth, settings);
            if (y + height > contentBottom) {
                nextColumnOrPage();
            }
            y = drawItem(doc, item, columnX(), y, columnWidth, source, settings);
        });

        y += 4;
    });

    drawFooter(doc, source, settings, sourceHash, qrDataUrl);

    const blob = doc.output('blob');
    const safeName = safeFilename(`${source.business.name}_${source.menu.title}`);
    const suffix = settings.preset === 'whatsapp' ? 'WhatsApp' : settings.preset === 'print_shop_packet' ? 'PrintShop' : 'PrintMenu';

    return {
        blob,
        filename: `${safeName}_${suffix}.pdf`,
        mimeType: 'application/pdf',
        pageCount: doc.getNumberOfPages(),
        sourceHash,
    };
}
